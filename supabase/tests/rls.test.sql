-- RLS is the only thing standing between a player's data and everyone else's,
-- and between a player and tomorrow's puzzle. A policy that looks right and is
-- wrong fails silently, so every rule below is asserted rather than assumed.
--
--   supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

-- Two real auth users, so the cross-user checks exercise auth.uid() rather
-- than a stand-in.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@nonet.test', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@nonet.test', '', now(), now(), now());

insert into public.puzzles (id, kind, difficulty, givens, solution, score, seed, publish_date, published_at)
values
  -- Published yesterday.
  ('aaaaaaaa-0000-0000-0000-000000000001', 'daily', 'hard',
   repeat('0', 81), repeat('123456789', 9), 61, 1001, current_date - 1, now() - interval '1 day'),
  -- Publishes tomorrow. Nobody may read this.
  ('aaaaaaaa-0000-0000-0000-000000000002', 'daily', 'expert',
   repeat('0', 81), repeat('123456789', 9), 90, 1002, current_date + 1, now() + interval '1 day'),
  -- Practice puzzles carry no publish date and are always readable.
  ('aaaaaaaa-0000-0000-0000-000000000003', 'practice', 'easy',
   repeat('0', 81), repeat('123456789', 9), 40, 1003, null, null),
  -- Dated today but not yet published: the archive is generated ahead of time,
  -- so this row exists during the window a date-based gate would have opened.
  ('aaaaaaaa-0000-0000-0000-000000000004', 'daily', 'medium',
   repeat('0', 81), repeat('123456789', 9), 50, 1004, current_date, now() + interval '5 minutes');

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

-- The server side of "resume exactly on reopen", and what the sign-in merge
-- compares by recency for an in-progress puzzle.
select has_table('public', 'autosaves', 'autosaves exists');
select has_column('public', 'autosaves', 'updated_at', 'an autosave carries the timestamp the merge compares');

-- The undo stack is deliberately not persisted: history is a full grid-and-notes
-- snapshot per action and would grow the row without bound (NONET-9).
select hasnt_column('public', 'autosaves', 'undo_stack', 'the undo stack is not persisted');

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
select is(
  (select relrowsecurity from pg_class where oid = 'public.autosaves'::regclass),
  true,
  'RLS is on for autosaves'
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

-- The case a date-based gate got wrong: dated today, published in five minutes.
-- `publish_date <= current_date` was already true for this row at 00:00.
select is(
  (select count(*)::int from public.puzzles where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  0,
  'a daily dated today is unreadable until its publish time, not its date'
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
-- Two solves is below the floor, so there is no percentile to leak.
select is(
  public.daily_percentile('aaaaaaaa-0000-0000-0000-000000000001', 432000),
  null,
  'the percentile withholds an answer until enough people have played'
);

-- With no update policy, RLS does not raise: it makes no row visible to
-- update, so the statement succeeds having changed nothing. That distinction
-- matters — the protection is real, but it is silent, so the assertion has to
-- be that the value survived rather than that an error was thrown.
update public.solves set duration_ms = 1 where user_id = '11111111-1111-1111-1111-111111111111';

select is(
  (select duration_ms from public.solves where user_id = '11111111-1111-1111-1111-111111111111'),
  432000,
  'a completed solve cannot be rewritten, even by its owner'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'a profile row exists for the signed-in user'
);

-- Autosaves: the player's own working state, and nobody else's.
insert into public.autosaves (user_id, puzzle_id, puzzle_kind, grid, notes)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
        'practice', repeat('0', 81), array_fill(0::smallint, array[81]));

select is(
  (select count(*)::int from public.autosaves),
  1,
  'a player can save their own in-progress board'
);

select throws_ok(
  $$insert into public.autosaves (user_id, puzzle_id, puzzle_kind, grid, notes)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000003',
            'practice', repeat('0', 81), array_fill(0::smallint, array[81]))$$,
  '42501',
  null,
  'a player cannot save a board as somebody else'
);

reset role;

-- ---------------------------------------------------------------------------
-- Constraints that protect the product rules
-- ---------------------------------------------------------------------------

-- One shared grid per day is the whole premise of a daily (GAME-RULES.md), and
-- it is what makes the publish job safe to re-run.
select throws_ok(
  $$insert into public.puzzles (kind, difficulty, givens, solution, score, seed, publish_date, published_at)
    values ('daily', 'easy', repeat('0', 81), repeat('123456789', 9), 40, 2002, current_date - 1, now())$$,
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

-- A denormalised kind that disagrees with the puzzle would defeat the practice
-- limit below it, so the composite foreign key makes disagreement impossible.
select throws_ok(
  $$insert into public.autosaves (user_id, puzzle_id, puzzle_kind, grid, notes)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000003',
            'daily', repeat('0', 81), array_fill(0::smallint, array[81]))$$,
  '23503',
  null,
  'an autosave cannot claim a kind the puzzle does not have'
);

-- Deleting a puzzle would shorten streaks that were honestly earned, and
-- streaks are derived, so nobody would see it happen.
select throws_ok(
  $$delete from public.puzzles where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '23503',
  null,
  'a puzzle with solves against it cannot be deleted'
);

-- "Two to twenty-four characters", per the Settings copy.
select throws_ok(
  $$update public.profiles set display_name = 'x' where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514',
  null,
  'a one-character display name is rejected'
);

select finish();
rollback;
