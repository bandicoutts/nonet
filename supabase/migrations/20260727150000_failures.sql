-- ---------------------------------------------------------------------------
-- Failures
-- ---------------------------------------------------------------------------
--
-- A puzzle that locked. **Not a solve**, deliberately: NONET-17 ruled that a
-- failed board writes no `solves` row, because a failed board is not a solve
-- and inventing one would put a run in the stats that never finished. That
-- decision stands — this is a separate record, with a separate table, and
-- nothing that reads `solves` needs to know it exists.
--
-- It exists because a day that was attempted and lost was previously
-- indistinguishable from a day never opened. The design asks to tell them apart
-- in two places — the Archive's Failed filter and Record's completion summary —
-- and neither was buildable. The fail model is central to this product (three
-- mistakes lock the board, one retry, the run held until midnight), so a lost
-- day is real information about a player's history rather than an absence.
-- DECISIONS.md NONET-27.

create table public.failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- `restrict`, matching `solves`: deleting a puzzle must not silently erase
  -- the record of someone having played it (NONET-14).
  puzzle_id uuid not null references public.puzzles (id) on delete restrict,

  -- The player's own calendar day at the moment the board locked, stored rather
  -- than derived — the same rule as `solves.local_date`, and for the same
  -- reason: deriving it would silently impose UTC on a rule that is explicitly
  -- the device's timezone (NONET-9).
  local_date date not null,

  -- One or two. There is no third attempt (NONET-17), and the constraint says
  -- so rather than trusting every writer to remember.
  attempts smallint not null default 1 check (attempts between 1 and 2),

  failed_at timestamptz not null default now(),

  -- One row per player per puzzle. A second failed attempt raises `attempts`;
  -- it does not add a row, and it does not move `local_date` — the day a puzzle
  -- was lost is the day it was *first* lost.
  primary key (user_id, puzzle_id)
);

alter table public.failures enable row level security;

-- Owner-only in every direction, like `solves` and `autosaves`.
create policy "failures are readable by their owner"
  on public.failures for select
  using ((select auth.uid()) = user_id);

create policy "failures are inserted by their owner"
  on public.failures for insert
  with check ((select auth.uid()) = user_id);

-- **Unlike `solves`, this one is updatable.** A completed solve is a fact and
-- the merge never amends it; a failure legitimately changes when the retry is
-- also lost, so the count has to be able to rise.
create policy "failures are updated by their owner"
  on public.failures for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "failures are deleted by their owner"
  on public.failures for delete
  using ((select auth.uid()) = user_id);

-- The archive reads a player's failures for a span of dates.
create index failures_by_date on public.failures (user_id, local_date);
