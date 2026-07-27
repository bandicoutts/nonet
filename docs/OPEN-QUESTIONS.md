# Open questions

Things that are **not decided**. Each carries a recommendation, but none of
them has been agreed — do not treat a recommendation here as a decision. When
one is settled, delete it from this file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. There is no hosted Supabase project

Everything in Phase 3 is verified against the **local stack only**. The daily
publish job has never run on a real schedule, and `pg_cron` needs two Vault
secrets set per environment before it does anything (see
`supabase/migrations/*_schedule.sql`).

**Recommendation:** create the project at the start of Phase 4 rather than
Phase 5. Nothing is lost by waiting — every edition is derived from its date,
so a missed day backfills byte-identically:

```bash
curl -X POST "$URL/functions/v1/publish-daily?date=2026-08-03" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

But a cron that has never fired is an untested cron, and the failure mode is
quiet — see NONET-17, where the job body referenced a function that did not
exist and nothing would have said so until someone noticed no daily had
appeared.

---

## 2. Four settings are stored and synced, and honoured by nothing

`showTimer`, `highlightMatching`, `highlightUnits` and `autoAdvance` round-trip
through `profiles` and are read back by the merge, but **no component consumes
them**. Only `inputMode` and `checking` reach the board.

**Recommendation:** wire them in Phase 4 with the Settings screen. Note that
`autoAdvance` needs engine work — there is no action for "move to the next
empty cell in reading order", and it belongs in the session reducer with the
other play rules rather than in React (NONET-8).

Flagged because the columns existing makes this look finished when it is not.

---

## 3. Solving a puzzle does nothing visible

`BoardScreen` records the solve and clears the autosave, then the board sits
there with a completed grid. There is no navigation to `/solved`, and `/solved`
is still a stub.

**Recommendation:** first thing in Phase 4. It is the most visible
incompleteness in the app as it stands.

---

## 4. Archive: pre-generate editions, or publish forward only?

The `published_at <= now()` policy exists precisely so a pre-generated future
edition stays hidden (NONET-14). Nothing pre-generates yet, so that guard is
currently protecting against a case that does not arise.

**Recommendation:** publish forward via cron and backfill on demand. Add a
script that loops a date range for backfill. Pre-generating buys nothing and
puts every future answer in a world-readable table behind a single predicate.

---

## 5. A lint test for cleared Tailwind namespaces

`theme.generated.css` clears `--color-*`, `--spacing-*` and `--breakpoint-*`,
so `bg-red-500`, `p-4` and `md:` **generate no CSS at all**. An ungenerated
utility is indistinguishable from one that has no effect: this is what hid the
`inset-0` bug in NONET-19, which silently broke every fixed overlay in the app.

**Recommendation:** add a test that scans `apps/web/src` for class names in the
cleared namespaces and fails on a match. Cheap, and it closes the whole class of
bug rather than the one instance. Nothing currently violates it.

---

## 6. Run `security-review` on the branch

RLS policies and the auth callback now exist, which is the point the original
Phase 3 handoff said to wait for.

**Recommendation:** run it before Phase 4 adds surface area. Particular things
worth an adversarial look: the `puzzles` select policy (it is the only thing
between anyone and tomorrow's answer), `daily_percentile`'s security-definer
body, and the auth callback's redirect handling.

---

## Smaller things, recorded so they are not rediscovered

- **`hintedCells` is not persisted.** `restoreSession` accepts it and
  `toRecord` does not write it, so a hinted cell loses its marker across a
  reload. Currently cosmetic — the attribute drives an animation identical to
  the ordinary one — but the field exists and is a lie by omission.
- **`pickPractice` has no caller.** It is written and tested; Home's practice
  section (Phase 4) is what will use it.
- **`kind: 'archive'` and `kind: 'replay'` are never written.** `BoardScreen`
  only ever records `daily` or `practice`. The archive and replay play modes do
  not exist yet.
- **One in-flight practice puzzle is enforced in the database but not the
  client.** The partial unique index covers signed-in players; a guest can hold
  several. The abandon confirm on Home is what should enforce it.
- **Practice exclusion reads localStorage only.** A signed-in player's solves
  from another device are only reflected after the next merge, so a puzzle
  solved elsewhere today could be dealt again. Acceptable for v1 with a
  1000-puzzle bank; noted rather than fixed.
- **The offline banner in `copy.md` is not built.**
