# supabase

Schema, RLS and the pgTAP suite that proves them.

```bash
supabase start          # local stack (Docker)
supabase db reset       # re-apply migrations from scratch
supabase test db        # the RLS suite
```

## Tables

| Table | Holds |
| --- | --- |
| `puzzles` | givens, solution, difficulty, **score**, **seed**, kind, publish date and time |
| `profiles` | one row per `auth.users`, created by trigger |
| `solves` | one row per completed attempt, including the player's **local date** |
| `autosaves` | the one unfinished puzzle per player per board, with `updated_at` |

`solves` and `autosaves` are separate tables rather than one with a nullable
finish time: an autosave is overwritten constantly and a solve is written once
and never changed, and the sign-in merge resolves them by opposite rules —
server wins for completed solves, latest wins for one in progress. The undo
stack is **not** in `autosaves`, by design (NONET-9).

`score` is the engine's weighted effort rating, persisted so the bank can be
re-banded from real solve times without re-solving every puzzle (NONET-4).
`seed` makes any puzzle reproducible, so the archive can be rebuilt from dates
alone if this table is lost (NONET-9).

Streaks and stats are **derived** from `solves` and never stored. The one
implementation lives in `apps/web/src/lib/streak.ts` and serves both guest
localStorage and signed-in rows, so the sign-in merge cannot change a count.

## What RLS actually enforces

- **`puzzles` is world-readable only once published.** The row contains the
  solution, so reading tomorrow's daily is reading tomorrow's answer. The select
  policy gates dailies on `published_at <= now()` — a timestamp, not a date,
  because a date boundary opens a pre-generated edition five minutes before the
  00:05 UTC publish, and `current_date` depends on a session timezone setting.
- **`puzzles` has no write policy at all.** The publish job and the bank seed use
  the service role and bypass RLS; an absent policy denies everyone else by
  default.
- **`solves`, `profiles` and `autosaves` are owner-only**, in every direction.
- **`solves` has no update policy either.** A completed solve is a fact — the
  merge inserts, it never amends. Note that this does not raise: RLS makes no
  row visible to update, so the statement succeeds having changed nothing.
- **The percentile is a `security definer` function returning one integer.** It
  compares a player against every player, which is exactly the read the policy
  forbids — so the aggregate is exposed and the rows are not. Counted solves are
  first-attempt, unassisted and checked, and it returns `null` below 20 of them:
  the function takes an arbitrary duration and can be binary-searched, so at
  small N it would reconstruct individual times.

All of the above is asserted in `tests/rls.test.sql`. A table with policies but
RLS switched off is wide open and looks entirely correct in a migration diff,
so even that is checked against the catalogue.

## Still to come in Phase 3

`functions/` — the daily publish job (00:05 UTC, weekly rhythm, idempotent) —
and `seed.sql`, the practice bank.

Not a pnpm workspace package.
