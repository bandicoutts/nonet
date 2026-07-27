-- Nonet: puzzles, profiles, solves.
--
-- Three tables and no denormalised counters. Streaks and stats are derived from
-- `solves` (ARCHITECTURE.md) — a stored streak is a second source of truth that
-- drifts the first time a solve is inserted out of order or deleted.

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
  givens char(81) not null check (givens ~ '^[0-9]{81}$'),
  solution char(81) not null check (solution ~ '^[1-9]{81}$'),

  -- The engine's weighted effort score. Persisted rather than recomputed so the
  -- bank can be re-banded from real solve times after launch without solving
  -- every puzzle again (NONET-4).
  score integer not null check (score >= 0),

  -- Every puzzle is reproducible from its seed alone, which is what lets the
  -- archive be rebuilt from scratch if this table is ever lost (NONET-9).
  seed bigint not null,

  -- Daily only. The date the edition belongs to; the publish job inserts it at
  -- 00:05 UTC on that date.
  publish_date date,

  created_at timestamptz not null default now(),

  -- A daily is defined by its date and a practice puzzle by not having one.
  -- Without this, a practice puzzle could surface in the archive.
  constraint publish_date_matches_kind check (
    (kind = 'daily' and publish_date is not null)
    or (kind = 'practice' and publish_date is null)
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

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or length(display_name) between 1 and 40),
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
  puzzle_id uuid not null references public.puzzles (id) on delete cascade,

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

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.puzzles enable row level security;
alter table public.profiles enable row level security;
alter table public.solves enable row level security;

-- Puzzles are public, but only once published. The row holds the solution, so
-- reading tomorrow's daily is reading tomorrow's answer — this policy is the
-- only thing preventing that, since the table is otherwise world-readable.
--
-- `current_date` here is the database's, which Supabase runs in UTC, matching
-- the 00:05 UTC publish.
create policy "published puzzles are readable by anyone"
  on public.puzzles for select
  using (
    kind = 'practice'
    or (kind = 'daily' and publish_date <= current_date)
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

create policy "a solve is updated by its owner"
  on public.solves for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "a solve is removed by its owner"
  on public.solves for delete using ((select auth.uid()) = user_id);

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
create function public.daily_percentile(p_puzzle_id uuid, p_duration_ms integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) = 0 then null
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
