# Nonet

Premium daily Sudoku web app — classic 9×9, one shared daily puzzle (00:05 UTC publish, weekly difficulty rhythm) plus unlimited practice. Sibling product to Halve (`~/Documents/Github/parity`): same architecture patterns, deliberately distinct design. Web-first (Next.js + Supabase + Vercel). Working name/domain: `nonet.app`.

## Repo map (pnpm monorepo)
- `apps/web` — Next.js 16 app (App Router, Tailwind v4). **Phase 3 complete: nine routes, the board, guest autosave, sign-in + merge, mobile drawer. Every screen except the board is still a stub.**
- `packages/engine` — pure TS sudoku generator + solver + difficulty rater + play rules (no runtime deps, no DOM). **Built.** API in `packages/engine/README.md`.
- `packages/design` — design tokens; single source of truth for styling. Claude Design prototype is the pixel reference.
- `supabase/` — migrations, RLS, pgTAP suite, the `publish-daily` edge function, and a 4000-puzzle `seed.sql`. **Start at `supabase/README.md`.**
- `design/` — the Claude Design prototype (pixel + behaviour reference, not code to port). **Start at `design/README.md`.**
- `docs/` — context docs (read on demand, see below)

## Read docs only when relevant
- `docs/ARCHITECTURE.md` — system overview, data model, request flows
- `docs/GAME-RULES.md` — game mechanics + product rules (mistakes, hints, streaks, daily/practice)
- `docs/DESIGN.md` — locked design language (cool/architectural; NOT Halve's warm editorial)
- `docs/DESIGN-BRIEF.md` — the original Claude Design brief; **historical, superseded in part by DECISIONS.md NONET-2**
- `docs/DECISIONS.md` — decision log; **append a new entry in the same commit as any architectural change**. **Read the file and take the next free ID before assigning one — never assume an ID is free.** Two sessions working in parallel both reached for NONET-35, and six code comments ended up citing an unrelated decision.
- `docs/ROADMAP.md` — phases & milestone checklist
- `docs/OPEN-QUESTIONS.md` — **what is not decided.** Read before assuming something was overlooked; it may be deliberate and unresolved

## Conventions (delta vs global CLAUDE.md)
Global Next.js 16 / Supabase / TypeScript rules apply. Project-specific:
- Design tokens in `packages/design` are the source of truth — never hardcode colors/spacing in components. They are transcribed from the Claude Design prototype's **Tokens** screen.
- **Styling is Tailwind v4, and the tokens are its only vocabulary.** `apps/web/src/app/theme.generated.css` is generated from `@nonet/design` (`pnpm --filter @nonet/web theme:gen`) and a test fails if it drifts. Tailwind's own palette, numeric spacing scale and breakpoints are cleared, so `bg-red-500`, `p-4` and `md:` do not exist — use a token utility, or an arbitrary value with a stated reason. Type roles are `type-*` utilities. Breakpoints are `drawer:` (768) and `rail:` (1100), nothing else. DECISIONS.md NONET-11.
- **A Tailwind class in a cleared namespace generates no CSS, and nothing tells you.** It is indistinguishable from a class that has no effect. This silently broke every `fixed inset-0` overlay in the app until NONET-19 — `inset-0` resolves through the numeric spacing multiplier, which was cleared. `--spacing-0` is now named so the zero utilities work. **If a style mysteriously does nothing, check the generated stylesheet for the rule before debugging anything else.**
- **Import extensions differ by package, and both forms have a reason.** `packages/engine` names `.ts` on every relative import, because Deno consumes it in the edge functions and cannot resolve an extensionless specifier. Everywhere else is extensionless, because Turbopack cannot resolve `./x.js` to `x.ts`. `.ts` is the one form all three resolvers accept; the engine uses it because it is the only package crossing the Deno boundary. App code imports through the `@/` alias. DECISIONS.md NONET-16.
- `pnpm --filter @nonet/web dev` is the app on 3000. The Phase 2 Vite harness is retired — `/board` is the real thing.
- `packages/engine` is framework-agnostic and must stay fully unit-tested; UI depends on it, not vice versa.
- **pnpm is pinned to 9.15.9.** Do not run `corepack prepare pnpm@latest` — pnpm 11 requires Node 22 and imports `node:sqlite`; this project is on Node 20.18. Use `corepack enable` and let `packageManager` resolve.
- Streaks/stats are **derived from the `solves` table**, never denormalized. Streak days use the player's LOCAL calendar day.
- Guest-first: everything must work signed-out via localStorage; sign-in only adds sync. Both Supabase client factories return `null` when unconfigured rather than throwing, and the app runs.
- **The merge rules are pure functions in `apps/web/src/lib/merge.ts`, tested without a database.** It is the one place where being wrong destroys a player's history. Change them there, not in `sync.ts`.
- **Verify in a browser, not just jsdom.** Every serious defect in Phase 3 — the selection ring on 32 cells, the fonts never loading, the cron calling a function that does not exist, every overlay not covering the screen — passed the test suite and was obvious on screen or when run by hand.
- **Never pipe a test run through `grep` and chain the next step with `&&`.** The exit code tested is grep's, not the suite's, so a red suite still commits — which is exactly how a failing `ArchiveScreen` assertion got committed.
- No emoji, no exclamation marks anywhere in UI copy.

## Locked decisions worth knowing before you touch anything
Full detail in DECISIONS.md NONET-2. The short version:
- **Nav is Today · Archive · Record.** There is no `/practice` route — practice is a section of Home.
- **The board has two input modes** (cell-first default, digit-first). In digit-first, repeated wrong placements of the *same loaded digit* count as **one** mistake. That is an engine rule and needs a test.
- **The first hint per puzzle confirms.** Hints are irreversible and are not undoable.
- **Leaving a puzzle is a back control** labelled for its origin (`← TODAY` / `← ARCHIVE`), never "close".
- **Sign-in merge:** server wins for completed solves, latest autosave wins for in-progress. Enforce in code and test it — the design mock cannot.
- **The daily is generated in the browser, not fetched.** It derives entirely from the date, so client, edge function and seed script all mint the identical grid. The row is resolved only to record a solve or read a percentile. `currentEdition` accounts for the 00:05 UTC publish — for five minutes after midnight the current puzzle is still yesterday's.
- **The mobile boundary is 768, and that is closed.** `design/export/layout.md` measures the prototype at 430; that is which artboard it was drawn on, not a product decision. DECISIONS.md NONET-17.
- **The prototype has no real accessibility semantics.** It designs focus *visuals* only; roles, `aria-*`, roving tabindex and focus trapping are yours to write.
- **Difficulty is one number: the engine's weighted effort score.** Given count no longer rates anything. `TECHNIQUE_WEIGHTS` and `TECHNIQUE_ORDER` are load-bearing — changing either silently re-rates every puzzle in the bank, so rerun `pnpm --filter @nonet/engine calibrate` and paste the new `SCORE_FLOORS`. Detail in DECISIONS.md NONET-4.
