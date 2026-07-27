# supabase

Stub. Schema, RLS migrations (`puzzles`, `profiles`, `solves`), seed data and the
daily-puzzle edge function (00:05 UTC, weekly rhythm, idempotent) land in
**Phase 3** — see [`docs/ROADMAP.md`](../docs/ROADMAP.md) and
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

Planned layout:

```
supabase/
  migrations/     schema + RLS
  functions/      edge functions (daily publish)
  seed.sql        puzzle bank seed
```

Not a pnpm workspace package.
