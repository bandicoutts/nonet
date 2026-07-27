# Roadmap

Phases & milestones. Check off as completed.

## Phase 0 — Foundation
- [x] Product + design decisions grilled and locked (DECISIONS.md NONET-1)
- [x] Claude Design prototype approved (home light/dark, board, solved)
- [x] Full-surface design brief written (DESIGN-BRIEF.md)
- [x] Context docs + root CLAUDE.md
- [x] Claude Design full-surface build received (all screens/states/viewports)
- [x] Design reviewed and resolved across 8 passes; decisions logged (DECISIONS.md NONET-2)
- [ ] Init pnpm monorepo skeleton (`apps/web` stub, `packages/engine`, `packages/design`, `supabase/` stub)

## Phase 1 — Engine (`packages/engine`)
- [ ] Board representation + constraint validators
- [ ] Human-style solver (technique-ranked: singles → pairs → X-wing → chains)
- [ ] Uniqueness checker (backtracking)
- [ ] Generator (unique solution, technique-bounded per difficulty)
- [ ] Difficulty rater → Easy/Medium/Hard/Expert
- [ ] Mistake rules incl. digit-first repeat containment (GAME-RULES.md) — unit-tested
- [ ] Fuzz tests asserting invariants

## Phase 2 — Design system + board UI
- [ ] Tokens in `packages/design`, from `design/export/tokens.json` (colour, type, space, motion, border, shadow)
- [ ] Resolve the AA failure on `--fg3` before it is baked in (4.34:1 on `--bg` in light; carries every kicker and caption) — see `design/README.md`
- [ ] Interactive board component (cell-first + digit-first, notes incl. long-press, undo/redo, error states, keyboard play)
- [ ] Number pad (remaining counts, spent state) + toolbar + pause veil
- [ ] Light/dark themes
- [ ] Focus states per the prototype's Focus screen + real ARIA grid semantics (the reference has none)

## Phase 3 — App shell + Supabase
- [ ] Next.js routes (Home, Board, Solved, Archive, Record, Auth, Settings, How-to-play, About) — no Practice route; it is a section of Home
- [ ] Schema + RLS migrations (`puzzles`, `profiles`, `solves`)
- [ ] Daily-puzzle edge function (00:05 UTC, weekly rhythm, idempotent)
- [ ] Guest localStorage play + autosave/resume
- [ ] Sign-in sync (magic link; merge rules per ARCHITECTURE.md — tested, plus the post-sign-in merge summary)

## Phase 4 — Full surface
- [ ] Streaks/stats derived from solves (local-day buckets)
- [ ] Archive + Record pages, percentiles
- [ ] Share, settings, edge/empty/error states per DESIGN-BRIEF.md
- [ ] E2E suite (Playwright) + a11y pass

## Phase 5 — Launch
- [ ] Domain, analytics, OG images
- [ ] Seed puzzle bank + first dailies
