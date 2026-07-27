# Open questions

Things that are **not decided**. Each carries a recommendation, but none of
them has been agreed — do not treat a recommendation here as a decision. When
one is settled, delete it from this file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. Email delivery: no domain, so no custom SMTP, so no code on hosted

*The hosted project itself is no longer a question — see DECISIONS.md NONET-22.
It is provisioned and the publish chain is proven end to end, cron included.*

The hosted dashboard will not let you edit an email template at all until custom
SMTP is configured, and the sign-in flow *is* a template — NONET-21 sends a code
rather than a link, and Supabase decides which from whether the template
references `{{ .Token }}`. So until SMTP is set up, **the hosted project sends
magic links while local sends codes**, and nothing fails loudly: the tests mock
Supabase, so only reading a real email from production would reveal it. The
built-in sender is development-only and rate-limited to a couple of emails an
hour regardless, so this was always launch work; it is listed here because the
template lock makes it block *auth* rather than block launch.

SMTP needs a domain to authenticate against (SPF, DKIM, DMARC), and `nonet.app`
is not owned yet — so the ordering is: domain, then SMTP, then paste
`supabase/templates/magic-link.html` into Authentication → Emails → Magic Link.

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

## 3. Archive: pre-generate editions, or publish forward only?

The `published_at <= now()` policy exists precisely so a pre-generated future
edition stays hidden (NONET-14). Nothing pre-generates yet, so that guard is
currently protecting against a case that does not arise.

**Recommendation:** publish forward via cron and backfill on demand. Add a
script that loops a date range for backfill. Pre-generating buys nothing and
puts every future answer in a world-readable table behind a single predicate.

---

## 4. Run `security-review` on the branch

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
