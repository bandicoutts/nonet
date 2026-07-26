# Nonet

Premium daily Sudoku web app — classic 9×9, one shared daily puzzle (00:05 UTC publish, weekly difficulty rhythm) plus unlimited practice. Sibling product to Halve (`~/Documents/Github/parity`): same architecture patterns, deliberately distinct design. Web-first (Next.js + Supabase + Vercel). Working name/domain: `nonet.app`.

## Repo map (pnpm monorepo — planned)
- `apps/web` — Next.js 16 app (the only planned frontend)
- `packages/engine` — pure TS sudoku generator + solver + difficulty rater (no deps, no DOM)
- `packages/design` — design tokens; single source of truth for styling. Claude Design prototype is the pixel reference.
- `supabase/` — migrations, edge functions, seed
- `docs/` — context docs (read on demand, see below)

## Read docs only when relevant
- `docs/ARCHITECTURE.md` — system overview, data model, request flows
- `docs/GAME-RULES.md` — game mechanics + product rules (mistakes, hints, streaks, daily/practice)
- `docs/DESIGN.md` — locked design language (cool/architectural; NOT Halve's warm editorial)
- `docs/DESIGN-BRIEF.md` — the full-surface Claude Design brief; canonical screen/state inventory
- `docs/DECISIONS.md` — decision log; **append a new entry in the same commit as any architectural change**
- `docs/ROADMAP.md` — phases & milestone checklist

## Conventions (delta vs global CLAUDE.md)
Global Next.js 16 / Supabase / TypeScript rules apply. Project-specific:
- Design tokens in `packages/design` are the source of truth — never hardcode colors/spacing in components.
- `packages/engine` is framework-agnostic and must stay fully unit-tested; UI depends on it, not vice versa.
- Streaks/stats are **derived from the `solves` table**, never denormalized. Streak days use the player's LOCAL calendar day.
- Guest-first: everything must work signed-out via localStorage; sign-in only adds sync.
- No emoji, no exclamation marks anywhere in UI copy.
