-- Nonet: puzzles, profiles, solves, autosaves.
--
-- Four tables and no denormalised counters. Streaks and stats are derived from
-- `solves` (ARCHITECTURE.md) — a stored streak is a second source of truth that
-- drifts the first time a solve is inserted out of order or deleted.
--
-- `solves` holds finished attempts and `autosaves` holds the one unfinished
-- one. They are separate tables rather than a nullable `finished_at` because
-- everything about them differs: an autosave is overwritten constantly and has
-- at most one row per puzzle, a solve is written once and never changes, and
-- the sign-in merge resolves the two by opposite rules — server wins for
-- completed solves, latest wins for in progress.

create type public.puzzle_kind as enum ('daily', 'practice');
create type public.difficulty as enum ('easy', 'medium', 'hard', 'expert');

-- How a solve was played. Wider than `puzzle_kind`: the same archive puzzle can
-- be an archive solve or a replay, and only `daily` ever touches a streak.
create type public.solve_kind as enum ('daily', 'archive', 'practice', 'replay');

-- ---------------------------------------------------------------------------
-- puzzles
-- ---------------------------------------------------------------------------

create table public.puzzles (
  id uuid primary key default gen_random_uuid(),
  kind public.puzzle_kind not null,
  difficulty public.difficulty not null,

  -- 81 cells in reading order, matching the engine's `Grid`. `0` is empty, so
  -- givens may contain zeros and a solution may not.
  --
  -- `text`, not `char(81)`: `char` is blank-padded and compares by ignoring
  -- trailing spaces, so a malformed 80-character grid could compare equal to a
  -- correct one. The regex fixes the length without any of that.
  givens text not null check (givens ~ '^[0-9]{81}$'),
  solution text not null check (solution ~ '^[1-9]{81}$'),

  -- The engine's weighted effort score. Persisted rather than recomputed so the
  -- bank can be re-banded from real solve times after launch without solving
  -- every puzzle again (NONET-4).
  score integer not null check (score >= 0),

  -- Every puzzle is reproducible from its seed alone, which is what lets the
  -- archive be rebuilt from scratch if this table is ever lost (NONET-9).
  seed bigint not null,

  -- Daily only. The edition's identity — what the archive is indexed by and
  -- what the share text counts from. Not what decides visibility.
  publish_date date,

  -- When the edition becomes readable. Daily only, and 00:05 UTC on its
  -- publish_date (GAME-RULES.md).
  --
  -- Visibility is a timestamp rather than `publish_date <= current_date` for two
  -- reasons, both of which bite once the archive is generated ahead of time
  -- rather than one row at a time. A date boundary flips at 00:00, making a
  -- pre-generated edition — and its solution — readable five minutes early. And
  -- `current_date` is `now()` in the *session* timezone: Supabase defaults to
  -- UTC, but that is a setting, and a predicate guarding unreleased answers
  -- should not depend on one. Comparing timestamptz to `now()` is immune to
  -- both.
  published_at timestamptz,

  created_at timestamptz not null default now(),

  -- A daily is defined by its date and a practice puzzle by not having one.
  -- Without this, a practice puzzle could surface in the archive.
  constraint publish_date_matches_kind check (
    (kind = 'daily' and publish_date is not null and published_at is not null)
    or (kind = 'practice' and publish_date is null and published_at is null)
  )
);

-- One shared grid per day — the premise of a daily, and what makes the publish
-- job safe to re-run.
create unique index puzzles_one_daily_per_date on public.puzzles (publish_date)
  where kind = 'daily';

-- The seed determines the puzzle, so the same seed twice in a band is a
-- duplicate row rather than a second puzzle.
create unique index puzzles_seed_unique on public.puzzles (kind, difficulty, seed);

create index puzzles_practice_bank on public.puzzles (difficulty, id) where kind = 'practice';

-- Referenced by the composite foreign key on `autosaves`, which is what keeps
-- that table's denormalised `puzzle_kind` honest.
alter table public.puzzles add constraint puzzles_id_kind_unique unique (id, kind);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- "Two to twenty-four characters", per the Settings copy. It is shown on
  -- shared results, so the bound is the design's, not an arbitrary one.
  display_name text check (display_name is null or length(display_name) between 2 and 24),
  created_at timestamptz not null default now()
);

-- A profile row must exist the moment a user does: sign-in is a magic link, so
-- there is no form in which to create one, and every later write assumes it.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- solves
-- ---------------------------------------------------------------------------

create table public.solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- `restrict`, not `cascade`. Deleting a puzzle would otherwise delete the
  -- solves against it, silently shortening streaks that were honestly earned —
  -- and streaks are derived, so the change would be invisible until someone
  -- noticed their run had shrunk. Puzzles are never deleted; if one ever is,
  -- this makes it fail loudly instead.
  puzzle_id uuid not null references public.puzzles (id) on delete restrict,

  solved_at timestamptz not null default now(),

  -- The player's own calendar day at the moment of the solve, recorded rather
  -- than derived. Streak days use the device timezone, so a player who flies
  -- west can bank two dailies in one apparent day and one who flies east can
  -- skip one, but a streak never breaks because of a flight (NONET-9).
  -- Deriving this from `solved_at` later would silently impose UTC.
  local_date date not null,

  duration_ms integer not null check (duration_ms >= 0),
  mistakes smallint not null default 0 check (mistakes between 0 and 3),
  used_hint boolean not null default false,

  -- Three mistakes lock the board; solving the retry before local midnight
  -- keeps the streak, marked second attempt. There is no third.
  attempt smallint not null default 1 check (attempt between 1 and 2),

  -- False when the purist toggle was off: nothing was flagged and nothing
  -- tallied, so the solve earns no percentile.
  checked boolean not null default true,

  kind public.solve_kind not null,

  constraint one_row_per_attempt unique (user_id, puzzle_id, attempt)
);

create index solves_streak on public.solves (user_id, local_date)
  where kind = 'daily';

create index solves_percentile on public.solves (puzzle_id, duration_ms)
  where kind = 'daily' and attempt = 1 and used_hint = false and checked = true;

-- Every query a player makes is filtered to their own rows by RLS, including
-- practice, which the streak index deliberately excludes.
create index solves_by_user on public.solves (user_id);

-- ---------------------------------------------------------------------------
-- autosaves
-- ---------------------------------------------------------------------------

-- The unfinished puzzle. One row per player per puzzle, overwritten as they
-- play, deleted when the puzzle is finished or abandoned.
--
-- This is the server side of "resume exactly on reopen", and the thing the
-- sign-in merge compares by recency: server wins for completed solves, but the
-- **latest** autosave wins for one in progress, which is only answerable if
-- both sides carry a timestamp (ARCHITECTURE.md).
create table public.autosaves (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_id uuid not null references public.puzzles (id) on delete cascade,

  -- Denormalised from `puzzles`, because a partial index cannot contain a
  -- subquery and the practice limit below needs the kind in this row. The
  -- composite foreign key makes it provably the puzzle's own kind rather than
  -- whatever the client sent.
  puzzle_kind public.puzzle_kind not null,
  foreign key (puzzle_id, puzzle_kind) references public.puzzles (id, kind),

  -- The board as it stands, in the engine's reading order.
  grid text not null check (grid ~ '^[0-9]{81}$'),

  -- One 9-bit candidate mask per cell, matching the engine's note encoding.
  notes smallint[] not null check (
    array_length(notes, 1) = 81 and 0 <= all (notes) and 511 >= all (notes)
  ),

  elapsed_ms integer not null default 0 check (elapsed_ms >= 0),
  mistakes smallint not null default 0 check (mistakes between 0 and 3),
  hints_used smallint not null default 0 check (hints_used between 0 and 3),

  -- **Not the undo stack.** History is a full grid-and-notes snapshot per
  -- action, and writing it on every keystroke would grow this row without
  -- bound. Unlimited undo means unlimited within a sitting (NONET-9).

  updated_at timestamptz not null default now(),

  primary key (user_id, puzzle_id)
);

-- One in-flight practice puzzle at a time (GAME-RULES.md): starting another
-- prompts to abandon the first. Dailies and archive editions are not limited,
-- so the constraint is scoped rather than global.
create unique index autosaves_one_practice_in_flight
  on public.autosaves (user_id)
  where puzzle_kind = 'practice';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.puzzles enable row level security;
alter table public.profiles enable row level security;
alter table public.solves enable row level security;
alter table public.autosaves enable row level security;

-- Puzzles are public, but only once published. The row holds the solution, so
-- reading tomorrow's daily is reading tomorrow's answer — this policy is the
-- only thing preventing that, since the table is otherwise world-readable.
--
-- Gated on `published_at <= now()`, not on a date. See the column comment: a
-- date boundary would open a pre-generated edition five minutes early, and
-- `current_date` depends on a session timezone setting that this predicate must
-- not be at the mercy of.
create policy "published puzzles are readable by anyone"
  on public.puzzles for select
  using (
    kind = 'practice'
    or (kind = 'daily' and published_at <= now())
  );

-- No insert, update or delete policy anywhere on puzzles: writes belong to the
-- publish job and the bank seed, both of which use the service role and bypass
-- RLS. An absent policy denies by default, which is the intent stated plainly.

create policy "a profile is readable by its owner"
  on public.profiles for select using ((select auth.uid()) = id);

create policy "a profile is editable by its owner"
  on public.profiles for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "a solve is readable by its owner"
  on public.solves for select using ((select auth.uid()) = user_id);

create policy "a solve is written by its owner"
  on public.solves for insert with check ((select auth.uid()) = user_id);

-- **There is deliberately no update policy on solves.** A completed solve is a
-- fact: the merge inserts, it never amends, and nothing in the product edits a
-- finished run. An update path would exist only to let a duration or a mistake
-- count be rewritten after the fact, which is the one thing that could quietly
-- corrupt a percentile.
create policy "a solve is removed by its owner"
  on public.solves for delete using ((select auth.uid()) = user_id);

-- Autosaves are the player's working state: written constantly, replaced on
-- every keystroke, and removed when the puzzle is finished or abandoned.
create policy "an autosave is readable by its owner"
  on public.autosaves for select using ((select auth.uid()) = user_id);

create policy "an autosave is written by its owner"
  on public.autosaves for insert with check ((select auth.uid()) = user_id);

create policy "an autosave is updated by its owner"
  on public.autosaves for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "an autosave is removed by its owner"
  on public.autosaves for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Percentile
-- ---------------------------------------------------------------------------

-- The percentile compares one player against every player, which is precisely
-- the read the policy above forbids. Rather than widen the policy — which would
-- expose every player's times, mistakes and hint use — the aggregate is a
-- security-definer function that returns a single number and never a row.
--
-- Counted solves are first-attempt, unassisted and checked, per ARCHITECTURE.md:
-- a retry, a hint or the purist toggle all forfeit the percentile, so including
-- them would rank a player against runs that were never comparable.
--
-- **Null below the floor, and the floor is not cosmetic.** The function is
-- callable by anyone with an arbitrary duration, so it can be binary-searched:
-- with a handful of solves on the board that reconstructs individual times, and
-- with one solve it reveals that person's exactly. Requiring a population
-- before answering closes the inference channel — and "top 22%" of nine solves
-- was never a statistic anyway. An edition simply has no percentile until
-- enough people have played it.
create function public.daily_percentile(p_puzzle_id uuid, p_duration_ms integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) < 20 then null
    -- Top 1% is better than 99% of solves. Ceil keeps a player who beat
    -- everyone in "top 1%" rather than "top 0%".
    else greatest(1, ceil(
      100.0 * count(*) filter (where duration_ms <= p_duration_ms) / count(*)
    )::integer)
  end
  from public.solves
  where puzzle_id = p_puzzle_id
    and kind = 'daily'
    and attempt = 1
    and used_hint = false
    and checked = true;
$$;

revoke execute on function public.daily_percentile(uuid, integer) from public;
grant execute on function public.daily_percentile(uuid, integer) to authenticated, anon;
