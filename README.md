# Nonet

A premium daily Sudoku web app. One shared puzzle a day, unlimited practice, streaks derived honestly from solves.

Phases 0 and 1 are done: the pnpm monorepo skeleton, and `packages/engine` — the generator, human-style solver, difficulty rater and play rules. Phase 2 (design tokens and board UI) is next. See [docs/ROADMAP.md](docs/ROADMAP.md).

Context docs live in [docs/](docs/); start with [CLAUDE.md](CLAUDE.md). The engine's public API is in [packages/engine/README.md](packages/engine/README.md).

```bash
corepack enable && pnpm install && pnpm -r test
```
