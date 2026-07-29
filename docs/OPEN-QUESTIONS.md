# Open questions

Things that are **not decided**. Each carries a recommendation, but none of
them has been agreed — do not treat a recommendation here as a decision. When
one is settled, delete it from this file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. Nothing is open

Every question that was here has been settled and recorded in `DECISIONS.md`.
The three most recently closed:

- **Repeating a mistake** (NONET-39, NONET-40). Cell-first gained containment
  keyed on digit *and* cell, and re-tapping an already-loaded digit-first key no
  longer re-arms the charge. Both were found by auditing which reducer paths can
  be dispatched with values equal to the current state (NONET-38), and the
  second had been shaping the mistake tally with no test holding it in place.

- **Email delivery** (NONET-30). Custom SMTP is configured through
  `config.toml` and pushed with `supabase config push`, so the sign-in template
  cannot drift between local and hosted. Verified against the hosted project by
  sending a real code and verifying it: six digits, no link, session
  established. The sending domain is temporary and unrelated to Nonet, and
  swapping it at launch is a credential change with nothing to migrate — that is
  a `ROADMAP.md` item rather than an open question.

- **Security review** (NONET-20, re-run after Phase 4). No findings. RLS on the
  new `failures` table verified live: anon reads `[]` and is denied on insert.

What is *not* built is on `ROADMAP.md`. What is deliberately not decided would
be here, and at the moment nothing is.

---

## Smaller things, recorded so they are not rediscovered

- **`hintedCells` is deliberately not persisted.** `restoreSession` accepts it
  and `toRecord` does not write it. That is now a decision rather than an
  omission: the marker exists to trigger `motion-place`, which fires *when a
  hint is placed*, so it is a transient animation cue and not state — the same
  category as the selection and the undo stack, neither of which survives a
  reload either (NONET-9, NONET-15). Persisting it would mean a column on
  `autosaves` to replay an animation for a placement that happened yesterday.

- **Percentiles are shown on the result screen only, and that is the end of it.**
  A percentile is a *live* comparison that moves as more people solve the same
  edition. Storing one at solve time and listing it later would show a figure
  that was true once; fetching them live for a month view is a database call per
  row. Neither is worth it for a number whose whole meaning is "right now".

- **"Puzzle unavailable" has copy and can no longer happen.** `copy.md` gives an
  error state for "Today's edition did not load", which assumed the daily was
  fetched. It is generated in the browser from the date (NONET-16), so there is
  nothing to fail — and the two paths that could go wrong both degrade instead:
  `/solved` with no recorded solve returns to Home, and `/board` with an
  unparseable ref falls back to the daily. A decision made for offline play
  turned out to delete a whole failure mode.

- **Practice exclusion reads localStorage only.** A signed-in player's solves
  from another device are only reflected after the next merge, so a puzzle
  solved elsewhere today could be dealt again. Acceptable for v1 with a
  1000-puzzle bank; noted rather than fixed.

- **One in-flight practice puzzle is enforced in the database, and by the
  abandon confirm on Home** (NONET-23) — but a guest who never passes through
  Home can still accumulate several, and `practiceInFlight` deliberately takes
  the most recent rather than assuming there is one.
