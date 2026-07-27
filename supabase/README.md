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

## Publishing

`functions/publish-daily` generates the edition and hands it to
`publish_daily()`. The function holds no state — seed, difficulty and number
are all derived from the date — and **idempotency lives in the SQL**, not the
function: one `on conflict` statement covers a cron that fires twice, a retry
after a timeout and a manual backfill alike, and returns the existing id so a
repeat is indistinguishable from the first run.

`?date=YYYY-MM-DD` backfills a missed day. `published_at` is derived inside the
function as 00:05 UTC on the edition's own date, so no caller can publish early.

Only `service_role` may execute it. Note that revoking from `PUBLIC` is *not*
enough: Supabase's default privileges grant execute on new functions to `anon`
and `authenticated` by name, and a named grant survives a revoke from `PUBLIC`.
Both are revoked explicitly, and the suite asserts the privilege directly.

## The practice bank

`seed.sql` holds 1000 puzzles per difficulty, generated with seeds `1..1000` per
band:

```bash
pnpm --filter @nonet/engine seed-bank 1000   # ~35s, 790 KB
```

Checked in, but reproducible byte-for-byte, and any single puzzle can be rebuilt
from its band and seed. Loading it twice is a no-op. Measured score ranges match
the calibrated bands (NONET-4): easy 43-46, medium 47-57, hard 58-82, expert
83-346.

## A local-stack landmine

On the local image (PostgreSQL 17.6, arm64) calling **any** function the current
role lacks EXECUTE on **segfaults the backend** — security definer or not, and
regardless of the function body. Function-permission tests therefore assert
`has_function_privilege` rather than expecting a `42501`. Table-level denials
raise normally; it is only function execute.

Not a pnpm workspace package.
