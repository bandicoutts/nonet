-- Player settings, on the profile.
--
-- The Settings copy promises "Settings are kept in this browser. Sign in and
-- they follow you, along with the streak." Only the second half needed
-- building: a guest's settings live in localStorage, and these columns are
-- where they land once there is an account to hang them on.
--
-- **Typed columns, not a `jsonb` blob.** The set is fixed, small and known, and
-- every value is constrained — a blob would accept anything the client sent and
-- move the validation to whichever reader remembered to do it. Seven columns
-- cost one migration; a blob costs a decision every time it is read.
--
-- Deliberately `text` with a check rather than the enums used for `difficulty`
-- and `kind`. Those describe puzzles, which are permanent; these describe a UI
-- that will gain options, and a check constraint is a one-line change where an
-- enum is a type alteration.

alter table public.profiles
  -- An explicit choice must survive a device that disagrees, so "system" is a
  -- stored value rather than the absence of one (NONET-6).
  add column theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),

  -- Cell-first is the default; digit-first is the fast mode (NONET-2).
  add column input_mode text not null default 'cellFirst'
    check (input_mode in ('cellFirst', 'digitFirst')),

  -- The purist toggle. Off means nothing is flagged, nothing is tallied, and
  -- the solve earns no percentile.
  add column checking boolean not null default true,

  -- Off by default: moving the selection after a placement is help some players
  -- want and others find disorienting (NONET-2).
  add column auto_advance boolean not null default false,

  add column highlight_matching boolean not null default true,
  add column highlight_units boolean not null default true,

  -- Hiding the timer does not stop it. The time is always recorded and always
  -- shown at the end.
  add column show_timer boolean not null default true;

-- The settings a player would lose by signing in on a new device are the ones
-- worth carrying, so they move with the profile the merge already touches.
comment on column public.profiles.theme is
  'Explicit choice beats system preference in both directions (NONET-6).';
