# Open questions

Things that are **not decided**. Each carries a recommendation, but none of
them has been agreed — do not treat a recommendation here as a decision. When
one is settled, delete it from this file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. Does repeating a move you have already made cost a life again?

Found while auditing which reducer paths can be dispatched with values equal to
the current state (NONET-38). Both are **mistake-tally questions, not identity
questions** — which is why neither was changed along with `selectCell`, where
"nothing happened" is unambiguous. Measured, not assumed:

- **Cell-first: placing the same wrong digit into the same cell charges every
  time.** Three repeats take the tally 1, 2, 3 and lock the board. Digit-first
  has containment for exactly this — the doc for it says three fast taps ending
  a puzzle is "a cliff that exists only because the mode is fast" — and
  cell-first has no equivalent. A player holding a key down, or jabbing at a
  cell that is not taking the digit they expect, loses the board to one wrong
  idea rather than three.

  *Recommendation:* charge a repeat of the **same wrong digit in the same cell**
  once, which is the containment rule cell-first already lacks, and leave a
  different wrong digit costing a fresh life. Needs a GAME-RULES.md change and
  an engine test; it is not a bug fix, because the current behaviour is what the
  rules as written say.

- **Digit-first: re-tapping the already-loaded key re-arms the charge.**
  `loadDigit` always clears containment, so tapping `6` when `6` is already
  loaded takes `containedDigit` from `6` to `null` and the next wrong placement
  of that same digit costs a second life. The rule was written as "returning to
  a digit costs a fresh life", and re-tapping a key that is already loaded is
  arguably not returning to it — the player has expressed no change of mind.

  *Recommendation:* treat loading the digit that is already loaded as no
  gesture at all. Note this cannot be a mechanical "return the same state"
  change, because the containment clear is the behaviour in question.

Related and already noted: re-placing a digit already in a cell pushes a
duplicate undo snapshot, so one undo appears to do nothing. That is a
consequence of the same path, and worth fixing with whichever answer above is
taken rather than separately.

---

## 2. Nothing else is open

Every other question that was here has been settled and recorded in
`DECISIONS.md`. The two most recently closed:

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
