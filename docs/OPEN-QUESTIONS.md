# Open questions

Things that are **not decided**. Each carries a recommendation, but none of
them has been agreed — do not treat a recommendation here as a decision. When
one is settled, delete it from this file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. Nothing is open

Every question that was here has been settled and recorded in `DECISIONS.md`.
The two most recently closed:

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

- **`hintedCells` is not persisted.** `restoreSession` accepts it and
  `toRecord` does not write it, so a hinted cell loses its marker across a
  reload. Currently cosmetic — the attribute drives an animation identical to
  the ordinary one — but the field exists and is a lie by omission.
- **`kind: 'replay'` is never written.** `BoardScreen` records `daily`,
  `archive` and `practice`; replay mode does not exist, so the solved screen
  omits its "Replay, unscored" action rather than linking to a board that would
  record a second scored solve (NONET-23).
- **One in-flight practice puzzle is enforced in the database, and now by the
  abandon confirm on Home** (NONET-23) — but a guest who never passes through
  Home can still accumulate several, and `practiceInFlight` deliberately takes
  the most recent rather than assuming there is one.
- **Practice exclusion reads localStorage only.** A signed-in player's solves
  from another device are only reflected after the next merge, so a puzzle
  solved elsewhere today could be dealt again. Acceptable for v1 with a
  1000-puzzle bank; noted rather than fixed.
- **The offline banner in `copy.md` is not built.**
