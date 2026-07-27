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

## 2. Run `security-review` on the branch

RLS policies and the auth callback now exist, which is the point the original
Phase 3 handoff said to wait for.

Run once on the solved flow (NONET-20) and **not since**, while Home, Settings,
Record, Archive, the email-code auth rewrite and a URL-parsed puzzle ref all
landed. That is a lot of surface reviewed only in passing, by the person who
wrote it.

**Recommendation:** re-run across the new surface. Worth an adversarial look:
`parsePuzzleRef` (the only untrusted input parsed into a board), the client-side
`safeRedirect` in the code flow (NONET-21 moved it off the server), the new
`failures` RLS policies, and `daily_percentile`'s security-definer body.

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
