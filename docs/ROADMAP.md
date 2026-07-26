# Roadmap

Phases & milestones. Check off as completed.

## Phase 0 — Foundation
- [x] Product + design decisions grilled and locked (DECISIONS.md NONET-1)
- [x] Claude Design prototype approved (home light/dark, board, solved)
- [x] Full-surface design brief written (DESIGN-BRIEF.md)
- [x] Context docs + root CLAUDE.md
- [ ] Claude Design full-surface build received (all screens/states/viewports)
- [ ] Init pnpm monorepo skeleton (`apps/web` stub, `packages/engine`, `packages/design`, `supabase/` stub)

## Phase 1 — Engine (`packages/engine`)
- [ ] Board representation + constraint validators
- [ ] Human-style solver (technique-ranked: singles → pairs → X-wing → chains)
- [ ] Uniqueness checker (backtracking)
- [ ] Generator (unique solution, technique-bounded per difficulty)
- [ ] Difficulty rater → Easy/Medium/Hard/Expert
- [ ] Fuzz tests asserting invariants

## Phase 2 — Design system + board UI
- [ ] Tokens in `packages/design` from the Claude Design build
- [ ] Interactive board component (select/type, notes, undo/redo, error states, keyboard play)
- [ ] Number pad + toolbar + pause veil
- [ ] Light/dark themes

## Phase 3 — App shell + Supabase
- [ ] Next.js routes (Home, Board, Practice, Archive, Record, Auth, Settings, How-to-play, About)
- [ ] Schema + RLS migrations (`puzzles`, `profiles`, `solves`)
- [ ] Daily-puzzle edge function (00:05 UTC, weekly rhythm, idempotent)
- [ ] Guest localStorage play + autosave/resume
- [ ] Sign-in sync (magic link; merge rules per ARCHITECTURE.md)

## Phase 4 — Full surface
- [ ] Streaks/stats derived from solves (local-day buckets)
- [ ] Archive + Record pages, percentiles
- [ ] Share, settings, edge/empty/error states per DESIGN-BRIEF.md
- [ ] E2E suite (Playwright) + a11y pass

## Phase 5 — Launch
- [ ] Domain, analytics, OG images
- [ ] Seed puzzle bank + first dailies
