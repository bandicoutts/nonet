# Open questions

Things that are **not decided**. Where an item carries a recommendation, none
of them has been agreed — do not treat a recommendation here as a decision.
Audit findings (section 3) carry none by design: they are one line and a file
reference, and the code is the detail. When one is settled, delete it from this
file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. Is three lives and two attempts too strict, or just badly signposted?

**A product question, not a defect.** Three mistakes lock the board and a daily
may be retried once (GAME-RULES.md, NONET-39). That is stricter than the
comparisons: Sudoku.com allows unlimited retries, and on NYT a puzzle cannot be
failed at all. Nonet is the only one of the three where a player can lose a day.

**The escape hatch already exists and nobody can find it.** `checking: false`
turns auto-check off, and with it the tally, the flags and the lock entirely
(`session.ts` — with checking off nothing is flagged and nothing is counted). A
player who wants the relaxed game already has it. But it lives in Settings under
a purist framing, and the moment it becomes relevant — a board locking on the
third mistake — is the moment it is least reachable: the veil says "Three
mistakes — locked" and offers a retry or nothing.

So the question is **discoverability, not the limit**. Loosening the limit
spends the stakes that make a daily puzzle feel like one; the alternative costs a
line of copy.

*Recommendation:* **surface the choice during onboarding, and leave the lock
screen alone.**

Offering it at the lock was the first answer and it is the wrong one, for a
reason that only appears once you know the setting is **per-player, not
per-puzzle**: a player accepting it in frustration at a locked board would
silently turn the tally off for *every future board*, without realising they had.
A choice taken reactively, at the worst moment, that then applies forever is the
shape of a setting people end up wanting to undo and cannot find. Onboarding is
where the same choice is considered rather than extracted.

The alternative worth naming is making checking a **per-puzzle** choice, set
before starting, which removes the trap entirely — but it costs additional state:
`checking` would have to travel with the board rather than the player, which
means the autosave record, the merge rules, and the `solves` row that already
records `checked` all have to agree about where it lives.

---

## 2. Should a practice result be shareable, and as what?

**A product question, not a defect.** Practice, archive and replay solves have
no share control at all: `buildResult` gives them a `null` edition number
(`result.ts:253-262`) and `SolvedScreen` hides the whole share block when it is
null (`SolvedScreen.tsx:133`). Only today's daily can be shared.

That is not a guard to remove. **A daily share is a claim about a shared
object** — we all played No. 1247, here is how I did — which is why it works
with no link: the recipient can go and get the same puzzle. A practice share has
no shared object. The recipient cannot play the puzzle you played, so "Expert
practice, 4:12" is a boast with nothing behind it. Dropping the guard would ship
exactly that.

Two ways that work:

- **Put the seed in the share URL**, so the recipient can play the same practice
  puzzle. That turns a boast into a challenge and is the more interesting
  feature — and a real one: a URL scheme, a route change, and an OG variant that
  names the challenge rather than the edition.
- **Leave practice unshareable and make it legible.** A missing button reads as
  broken; a stated reason does not.

Recommendation: the first, eventually. Neither now. Note that the first is the
only one of the two that would also need the OG card to stop being
per-edition-only (NONET-43).

---

## 3. Unfixed findings from the UX and IA audits

Each verified against `HEAD` on 2026-07-29, not carried over on trust. The
generators that produced them are in `docs/audits/`; re-run those rather than
asking here for detail.

- Board and result back controls are hardcoded `← Today` → `/` whatever the origin, against NONET-2 — `BoardScreen.tsx:364`, `SolvedScreen.tsx:171`.
- "Practice another" goes to `/` rather than starting a practice puzzle — `SolvedScreen.tsx:240`.
- Three `?error=` codes are written to the redirect and read by nothing — `auth/callback/route.ts:24,29,36`.
- `PageStub.tsx` is unreferenced.
- `placeholder.ts` is unreferenced.
- `WINDOW_DAYS` is exported but used only inside its own module — `record.ts:21,102`.
- Archive month arrows carry `aria-disabled` with no `disabled`; the clamp in the handler is what makes a press inert — `ArchiveScreen.tsx:155,167`.
- `HomeScreen` and `SolvedScreen` each generate a whole puzzle from its seed to count givens — `HomeScreen.tsx:76`, `SolvedScreen.tsx:120`.

Two findings from those runs are **not** carried, for different reasons. The
missing sign-out above 768 was **fixed** by `e9d1464` — Settings reads auth
state and renders the control at every width, reachable from the footer. The
dead `WINDOW_DAYS` was **never true**: it is used at `record.ts:102`, so only
the export is surplus, which is what the line above says instead.

---

## 4. Nothing else is open

Every other question that was here has been settled and recorded in
`DECISIONS.md`. The three most recently closed:

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

What is *not* built is on `ROADMAP.md`.

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
