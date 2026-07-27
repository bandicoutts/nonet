# Open questions

Things that are **not decided**. Each carries a recommendation, but none of
them has been agreed — do not treat a recommendation here as a decision. When
one is settled, delete it from this file and record it in `DECISIONS.md`.

Settled questions live in `DECISIONS.md` (NONET-1 … NONET-19). If something is
not here and not there, it has probably not been thought about.

---

## 1. Email is sent from a domain that is not Nonet's

`nonet.app` is not owned yet, and custom SMTP needs a domain to authenticate
against — so sending runs on an unrelated domain already verified in Resend.

**This is deliberate and temporary.** It is strictly better than the
alternative: without custom SMTP the hosted dashboard refuses to edit an email
template at all, and this product's sign-in flow *is* a template (NONET-21), so
production would keep sending magic links while local sends codes with nothing
failing loudly. The built-in sender is also capped at a couple of emails an hour
and is development-only regardless.

**Swapping it later costs nothing that matters.** Change `admin_email` and the
Resend credentials, run `supabase config push`. Nothing stored references the
sender, so there is no migration — the only real cost of moving a sending domain
is losing accumulated reputation and breaking recipients' filters, and with no
users there is neither.

`sender_name` is "Nonet", which is what most mail clients show, so the
human-readable half is right even while the domain is not. A code is also far
more forgiving here than a magic link: there is nothing to click, so a
sender-domain mismatch cannot be leveraged for phishing — it merely looks odd.

**Still to do at launch:** own `nonet.app`, verify it in Resend, point
`admin_email` at it, and re-run `config push`.

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
