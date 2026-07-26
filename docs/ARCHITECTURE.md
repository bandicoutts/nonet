# Architecture

System overview for Nonet. Mirrors Halve's proven architecture; deltas are called out.

## Stack
- **Web:** Next.js 16 (App Router, SSR), Tailwind wired to `packages/design` tokens, deployed on Vercel.
- **Engine:** `packages/engine` — pure TS. 9×9 sudoku generator (unique solution, technique-bounded), human-style solver, difficulty rater (technique ceiling + given count → Easy/Medium/Hard/Expert).
- **Backend:** Supabase (Postgres + Auth + RLS + edge functions).

## Data model
- `puzzles` — id, grid (givens), solution, difficulty, kind (`daily` | `practice`), publish date (daily only).
- `profiles` — user id (FK auth.users), display name, created_at.
- `solves` — user id, puzzle id, solved_at, local_date, duration_ms, mistakes, used_hint, attempt (1|2), checked (bool), kind (daily/archive/practice/replay). One row per completed solve. Streaks/stats **derived** from this, never denormalized.

## Key flows
- **Daily:** scheduled edge function mints one shared puzzle/day, published 00:05 UTC. Difficulty by weekly rhythm (Mon Easy · Tue–Wed Medium · Thu–Fri Hard · Sat Expert · Sun Hard).
- **Guest-first:** full play + streaks in localStorage. Sign-in (magic link) syncs; server wins for completed solves, most-recent autosave wins for in-progress.
- **Autosave:** continuous (grid, notes, timer, mistakes); resume exactly on reopen.
- **Percentile:** first-attempt, unassisted, checked daily solves only; computed server-side against that day's solves.
- **Practice:** pre-built bank per difficulty; one in-flight practice puzzle at a time; results tracked separately, never touch streaks.

## Auth
Supabase Auth (email magic link) from day one; per-user data behind RLS. Sign-in is always optional — it protects data, never gates play.
