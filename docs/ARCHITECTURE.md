# Architecture

System overview for Nonet. Mirrors Halve's proven architecture; deltas are called out.

## Stack
- **Web:** Next.js 16 (App Router, SSR), Tailwind wired to `packages/design` tokens, deployed on Vercel.
- **Engine:** `packages/engine` — pure TS, no runtime dependencies. 9×9 generator (unique solution by construction, technique-bounded), human-style solver over a nine-technique ladder, difficulty rater (**weighted effort score** → Easy/Medium/Hard/Expert; see DECISIONS.md NONET-4), and the play rules — notes, hints, mistake counting including digit-first repeat containment, and a session reducer whose undo/redo never uncounts a mistake. See `packages/engine/README.md` for the public API.
- **Backend:** Supabase (Postgres + Auth + RLS + edge functions).

## Data model
- `puzzles` — id, grid (givens), solution, difficulty, **score**, seed, kind (`daily` | `practice`), publish date (daily only). `score` is the engine's weighted effort rating; persist it so the bank can be re-banded from real solve times after launch without re-solving every puzzle (DECISIONS.md NONET-4). `seed` makes any puzzle reproducible from the generator.
- `profiles` — user id (FK auth.users), display name (2–24 chars), created_at, plus the **seven settings columns** (theme, input_mode, checking, auto_advance, highlight_matching, highlight_units, show_timer) and `settings_synced_at`, which is how a first sign-in is recognised.
- `solves` — user id, puzzle id, solved_at, local_date, duration_ms, mistakes, used_hint, attempt (1|2), checked (bool), kind (daily/archive/practice/replay). One row per completed solve. Streaks/stats **derived** from this, never denormalized. `puzzle_id` is `on delete restrict`: deleting a puzzle would silently shorten earned streaks.
- `autosaves` — the one *unfinished* puzzle per player per board: grid, notes (81 masks), elapsed_ms, mistakes, hints_used, updated_at, and a denormalised `puzzle_kind` held honest by a composite FK. Separate from `solves` because an autosave is overwritten constantly, a solve is written once, and the sign-in merge resolves them by opposite rules. **Never the undo stack** (NONET-9).

### The guest side: every `localStorage` key

Guest-first means this is the *primary* store and the tables above are the copy
(DECISIONS.md NONET-9). Every read is wrapped and falls back, so a browser that
refuses storage still plays. `lib/sync.ts` + `lib/merge.ts` copy it up on
sign-in.

| Key | Owner | Scope | Shape | Server counterpart |
|---|---|---|---|---|
| `nonet:autosave:<kind>:<difficulty>:<seed>` | `storage.ts` | per puzzle | `{version, ref, grid (81 chars), notes (81 masks), elapsedMs, mistakes, hintsUsed, updatedAt}` | `autosaves` row |
| `nonet:solves` | `storage.ts` | global, append-only | `GuestSolve[]` — `{ref, solvedAt, localDate, durationMs, mistakes, usedHint, attempt, checked, kind}` | `solves` rows |
| `nonet:attempt:<kind>:<difficulty>:<seed>` | `puzzles.ts` | per puzzle | `{attempts, localDate}` (legacy: a bare number) | none — a failure is not a solve (NONET-27) |
| `nonet:resumed:<kind>:<difficulty>:<seed>` | `storage.ts` | per puzzle, one-shot | `true`; written by the merge, deleted on read | none |
| `nonet:settings` | `settings.ts` | global | the seven settings, camelCased | the seven `profiles` columns |
| `nonet:theme` | `theme.ts` | global | `'light' \| 'dark' \| 'system'` | `profiles.theme`, via the blob |
| `nonet:seen-intro` | `BoardScreen.tsx` | global, one-shot | `'1'`; suppresses `FirstRunNotice` | none |

Two things the table cannot show. **The theme is stored twice on purpose** — the
standalone key is what a screen reads and what the blocking `<head>` script
applies, the blob copy exists so it syncs with the other six (NONET-41). And a
**locked board writes an attempt record and no solve row**, which is why Archive
and Record each read two stores to draw one day.

Publication is gated on `published_at <= now()` — a timestamp, not a date. The row contains the solution, so read access is spoiler access, and a date boundary would open a pre-generated edition five minutes before its 00:05 UTC publish (DECISIONS.md NONET-14).

## Routes & navigation
Top-level nav is **Today · Archive · Record** — three items. Practice is a section of Home, not a route (DECISIONS.md NONET-2).

- `/` Home — daily hero, streak band, practice picker + resume + abandon confirm
- `/board` Board (immersive; daily, practice, archive and replay modes) · `/solved` result
- `/archive` · `/record` · `/settings` · `/how-to-play` · `/about` · `/auth`
- Settings, About and How to play are reached from the footer at every viewport and from the mobile drawer. Every route must be reachable from within the product, not only by URL.

## Key flows
- **Daily:** a `pg_cron` job calls the `publish-daily` edge function at 00:05 UTC. **Idempotency lives in SQL** (`publish_daily()`, one `on conflict`), so a cron firing twice, a retry and a manual backfill are all safe. **The client does not fetch the daily — it regenerates it** from the date, so play survives a Supabase outage and a guest never touches the network; the row is resolved only to record a solve or read a percentile. `currentEdition()` is the client's half of the publish gate: for five minutes after midnight the current puzzle is still yesterday's. Difficulty by weekly rhythm (Mon Easy · Tue–Wed Medium · Thu–Fri Hard · Sat Expert · Sun Hard). **The seed is derived from the date** (`seed = hash(ISO date)`), so every daily is reproducible from its date alone and the archive can be rebuilt if the table is lost. The puzzle number in the share text is days since epoch, not a stored counter (DECISIONS.md NONET-9).
- **Guest-first:** full play + streaks in localStorage. Sign-in (magic link) syncs; server wins for completed solves, most-recent autosave wins for in-progress. **This rule must be enforced in code and covered by a test — a design mock cannot enforce it.** The merge is surfaced once as a post-sign-in summary; it reports, it does not ask.
- **Autosave:** continuous (grid, notes, timer, mistakes, hints spent); resume exactly on reopen. **The undo stack is not persisted** — history is full grid+notes snapshots per action, and writing it on every keystroke would grow the payload without bound. Unlimited undo means unlimited within a sitting (DECISIONS.md NONET-9).
- **Percentile:** first-attempt, unassisted, checked daily solves only, via a `security definer` function returning **one integer and never a row set** — the aggregate needs a cross-user read the RLS policy forbids. Returns `null` below 20 qualifying solves: the function takes an arbitrary duration and can be binary-searched, so at small N it would reconstruct individual times.
- **Practice:** pre-built bank per difficulty; one in-flight practice puzzle at a time; results tracked separately, never touch streaks.

## Auth
Supabase Auth (email magic link) from day one; per-user data behind RLS. Sign-in is always optional — it protects data, never gates play.

- `src/proxy.ts` (Next 16's middleware) **refreshes the session and guards nothing.** Every route is playable signed out, so there is no page to gate.
- The auth callback's redirect target is checked against an **exact whitelist** (`src/lib/redirect.ts`), never a pattern. An open redirect there fires with a live session in hand.
- `emailRedirectTo` must also be allowlisted in `supabase/config.toml` under `additional_redirect_urls`, **including the path**. Supabase silently falls back to `site_url` on a mismatch rather than erroring (DECISIONS.md NONET-18).
- Sign out uses `{ scope: 'local' }`. The default revokes every session on every device.
