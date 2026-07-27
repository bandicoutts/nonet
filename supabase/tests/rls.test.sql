-- RLS is the only thing standing between a player's data and everyone else's,
-- and between a player and tomorrow's puzzle. A policy that looks right and is
-- wrong fails silently, so every rule below is asserted rather than assumed.
--
--   supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

-- Two real auth users, so the cross-user checks exercise auth.uid() rather
-- than a stand-in.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@nonet.test', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@nonet.test', '', now(), now(), now());

insert into public.puzzles (id, kind, difficulty, givens, solution, score, seed, publish_date)
values
  -- Published yesterday.
  ('aaaaaaaa-0000-0000-0000-000000000001', 'daily', 'hard',
   repeat('0', 81), repeat('123456789', 9), 61, 1001, current_date - 1),
  -- Publishes tomorrow. Nobody may read this.
  ('aaaaaaaa-0000-0000-0000-000000000002', 'daily', 'expert',
   repeat('0', 81), repeat('123456789', 9), 90, 1002, current_date + 1),
  -- Practice puzzles carry no publish date and are always readable.
  ('aaaaaaaa-0000-0000-0000-000000000003', 'practice', 'easy',
   repeat('0', 81), repeat('123456789', 9), 40, 1003, null);

insert into public.solves (user_id, puzzle_id, local_date, duration_ms, mistakes, used_hint, attempt, checked, kind)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 1, 432000, 1, false, 1, true, 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 1, 250000, 0, false, 1, true, 'daily');

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------

select has_table('public', 'puzzles', 'puzzles exists');
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'solves', 'solves exists');

-- score and seed are what let the bank be re-banded from real solve times and
-- any puzzle be rebuilt from its seed alone (NONET-4, NONET-9).
select has_column('public', 'puzzles', 'score', 'puzzles carries the engine score');
select has_column('public', 'puzzles', 'seed', 'puzzles carries the seed');
select has_column('public', 'solves', 'local_date', 'solves records the player local day');

-- pgTAP has no RLS assertion, so read the catalogue. Worth asserting rather
-- than assuming: a table with policies but RLS switched off is wide open, and
-- looks entirely correct in a migration diff.
select is(
  (select relrowsecurity from pg_class where oid = 'public.puzzles'::regclass),
  true,
  'RLS is on for puzzles'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'RLS is on for profiles'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.solves'::regclass),
  true,
  'RLS is on for solves'
);

-- ---------------------------------------------------------------------------
-- puzzles: readable, but never before publication
-- ---------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*)::int from public.puzzles where publish_date = current_date - 1),
  1,
  'anon can read a published daily'
);

select is(
  (select count(*)::int from public.puzzles where publish_date = current_date + 1),
  0,
  'anon cannot read a daily that has not published yet'
);

select is(
  (select count(*)::int from public.puzzles where kind = 'practice'),
  1,
  'anon can read the practice bank'
);

-- The solution is in the row, so leaking an unpublished puzzle leaks the answer
-- to a puzzle nobody has played. Worth its own assertion.
select is(
  (select count(*)::int from public.puzzles where solution is not null and publish_date > current_date),
  0,
  'no unpublished solution is reachable'
);

select throws_ok(
  $$insert into public.puzzles (kind, difficulty, givens, solution, score, seed, publish_date)
    values ('daily', 'easy', repeat('0', 81), repeat('123456789', 9), 40, 9999, current_date)$$,
  '42501',
  null,
  'anon cannot write puzzles'
);

reset role;

-- ---------------------------------------------------------------------------
-- solves: a player sees their own rows and nobody else's
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.solves),
  1,
  'a signed-in player sees only their own solves'
);

select is(
  (select user_id from public.solves),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'and the row they see is theirs'
);

select throws_ok(
  $$insert into public.solves (user_id, puzzle_id, local_date, duration_ms, kind)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', current_date, 1000, 'daily')$$,
  '42501',
  null,
  'a player cannot write a solve as somebody else'
);

-- The percentile is computed across every player's solves, which is exactly the
-- read RLS forbids. It is therefore a security-definer function returning one
-- number, never a row set — so the aggregate is available and the rows are not.
select is(
  public.daily_percentile('aaaaaaaa-0000-0000-0000-000000000001', 432000) > 0,
  true,
  'the percentile is reachable without reading other players rows'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'a profile row exists for the signed-in user'
);

reset role;

-- ---------------------------------------------------------------------------
-- Constraints that protect the product rules
-- ---------------------------------------------------------------------------

-- One shared grid per day is the whole premise of a daily (GAME-RULES.md), and
-- it is what makes the publish job safe to re-run.
select throws_ok(
  $$insert into public.puzzles (kind, difficulty, givens, solution, score, seed, publish_date)
    values ('daily', 'easy', repeat('0', 81), repeat('123456789', 9), 40, 2002, current_date - 1)$$,
  '23505',
  null,
  'a second daily cannot be published for the same date'
);

-- Retry is allowed once and marked second attempt; there is no third.
select throws_ok(
  $$insert into public.solves (user_id, puzzle_id, local_date, duration_ms, attempt, kind)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', current_date, 1000, 3, 'practice')$$,
  '23514',
  null,
  'attempt cannot exceed two'
);

select throws_ok(
  $$insert into public.puzzles (kind, difficulty, givens, solution, score, seed)
    values ('practice', 'easy', 'nope', repeat('123456789', 9), 40, 3003)$$,
  '23514',
  null,
  'a grid that is not 81 cells is rejected'
);

-- A practice puzzle with a publish date would appear in the archive; a daily
-- without one could never be found by date.
select throws_ok(
  $$insert into public.puzzles (kind, difficulty, givens, solution, score, seed, publish_date)
    values ('practice', 'easy', repeat('0', 81), repeat('123456789', 9), 40, 4004, current_date)$$,
  '23514',
  null,
  'a practice puzzle cannot carry a publish date'
);

select finish();
rollback;
