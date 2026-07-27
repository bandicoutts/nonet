# Roadmap

Phases & milestones. Check off as completed.

## Phase 0 — Foundation
- [x] Product + design decisions grilled and locked (DECISIONS.md NONET-1)
- [x] Claude Design prototype approved (home light/dark, board, solved)
- [x] Full-surface design brief written (DESIGN-BRIEF.md)
- [x] Context docs + root CLAUDE.md
- [x] Claude Design full-surface build received (all screens/states/viewports)
- [x] Design reviewed and resolved across 8 passes; decisions logged (DECISIONS.md NONET-2)
- [x] Init pnpm monorepo skeleton (`apps/web` stub, `packages/engine`, `packages/design`, `supabase/` stub)

## Phase 1 — Engine (`packages/engine`)
- [x] Board representation + constraint validators
- [x] Human-style solver (technique-ranked: singles → pairs → X-wing → chains)
- [x] Uniqueness checker (backtracking)
- [x] Generator (unique solution, technique-bounded per difficulty)
- [x] Difficulty rater → Easy/Medium/Hard/Expert
- [x] Mistake rules incl. digit-first repeat containment (GAME-RULES.md) — unit-tested
- [x] Fuzz tests asserting invariants

## Phase 2 — Design system + board UI
- [x] Tokens in `packages/design`, from `design/export/tokens.json` (colour, type, space, motion, border, shadow) — with the `--fg3` / `--fg3-text` split applied and AA enforced by test
- [x] Resolve the AA failure on `--fg3` before it is baked in — split into `--fg3` (disabled/spent, WCAG-exempt) and `--fg3-text` (light `#5A5F65` / dark `#A0A6AA`); DECISIONS.md NONET-5
- [ ] Touch targets per DECISIONS.md NONET-9 — fix the banner dismiss (the only WCAG AA breach, at ~22px against a 24px minimum), lift the 40px and 28px controls to 44; 39px grid cells at 390 are an accepted exception
- [x] Interactive board component (cell-first + digit-first, notes incl. long-press, undo/redo, error states, keyboard play)
- [x] Number pad (remaining counts, spent state)
- [x] Board toolbar + pause veil
- [x] Light/dark themes (tokens + `data-theme`, explicit choice beats system preference)
- [x] Real ARIA grid semantics (the reference has none)
- [x] Focus states matched to the prototype's Focus screen (2/4/6px ring stack when focused and selected)
- [x] Board layout at all three viewports — rail at 1100+, band below, sticky at mobile

## Phase 3 — App shell + Supabase
- [x] Next.js routes (Home, Board, Solved, Archive, Record, Auth, Settings, How-to-play, About) — no Practice route; it is a section of Home
- [x] Mobile drawer below 768 (full-frame overlay, focus-trapped, Esc closes, scroll locked) — 18 tests, verified in the browser
- [x] Schema + RLS migrations (`puzzles`, `profiles`, `solves`) — 23 pgTAP assertions, incl. that anon cannot read an unpublished daily
- [x] Streak derivation over solve rows, shared by guest and signed-in
- [x] Daily-puzzle edge function (00:05 UTC, weekly rhythm, idempotent) — idempotency in SQL, verified against the local stack
- [x] Practice bank: 1000 puzzles per difficulty, reproducible from seeds
- [x] Daily scheduled by `pg_cron` at 00:05 UTC, secrets from Vault, inert until they are set
- [x] Settings: seven columns on `profiles`, guest store, and the shared shape the sync copies
- [x] Retry / second attempt, and the PauseVeil copy corrected against `copy.md`
- [x] Guest localStorage play + autosave/resume — `restoreSession` in the engine, storage and autosave in `apps/web/src/lib`
- [x] Sign-in sync (magic link; merge rules per ARCHITECTURE.md — 16 tests, plus the post-sign-in merge summary) — verified end to end against the local stack

## Phase 4 — Full surface

Phase 3 left the shell complete and every screen but the board a stub. The
known gaps are listed in `OPEN-QUESTIONS.md`; the ones that are work rather
than questions are here.

- [x] **Solved flow.** Result screen, run extended, stat grid, spoiler-free share
      text, and the dwell-then-navigate from a finished board (DECISIONS.md NONET-20)
- [x] Home: daily hero across six states, streak band, practice picker + resume
      + abandon confirm; `/board` now takes a puzzle in the URL (NONET-23)
- [x] Honour the four settings that were stored and synced but read by nothing;
      `autoAdvance` is an engine rule, not React state (NONET-24)
- [x] Settings screen (NONET-24)
- [ ] Archive + Record pages, percentiles
- [ ] Archive and replay play modes — `solves.kind` can hold them, nothing writes them
- [ ] Offline banner, edge/empty/error states per DESIGN-BRIEF.md
- [ ] Streaks/stats surfaced (derivation itself is done and tested)
- [ ] E2E suite (Playwright) + a11y pass
- [x] Lint test for cleared Tailwind namespaces (NONET-20)

## Phase 5 — Launch
- [ ] Domain, analytics, OG images
- [ ] Seed puzzle bank + first dailies
