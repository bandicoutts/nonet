# @nonet/web

The Next.js 16 app — App Router, Tailwind v4 wired to `@nonet/design`.

```bash
pnpm --filter @nonet/web dev          # the app, port 3000
pnpm --filter @nonet/web dev:harness  # the Phase 2 component harness, port 5173
pnpm --filter @nonet/web test
pnpm --filter @nonet/web theme:gen    # regenerate src/app/theme.generated.css
```

## Routes

Nine, in three route groups — the group decides the chrome, so the directory
tree is the contract and `test/routes.test.ts` asserts it.

| Group | Chrome | Routes |
| --- | --- | --- |
| `(site)` | Site header + footer | `/` · `/archive` · `/record` · `/settings` · `/how-to-play` · `/about` |
| `(immersive)` | None — the board is a mode, not a page | `/board` · `/solved` |
| `(minimal)` | Wordmark only | `/auth`, and `not-found` / `error` through the same component |

There is no `/practice` route: practice is a section of Home (NONET-2).

## Styling

Tailwind v4, with the tokens as the only vocabulary. `src/app/theme.generated.css`
is generated from `@nonet/design` and maps every colour, space step and layout
breakpoint onto a utility — Tailwind's own palette, numeric spacing scale and
breakpoints are cleared, so `bg-red-500`, `p-4` and `md:` do not exist. Each type
role is a `type-*` utility that carries size, line height, tracking and weight
together, responsive without a variant.

Regenerate with `theme:gen` after any token change; `test/theme-layer.test.ts`
fails if the committed file and the tokens disagree.

## Fonts

Archivo and IBM Plex Mono are self-hosted through `next/font`. The token sheet
names the families; `globals.css` points `--font-sans` and `--font-mono` at the
loaded faces.

## Where things are

| Path | Holds |
| --- | --- |
| `src/lib/merge.ts` | **The sign-in merge rules, as pure functions.** The one place being wrong destroys history. Change rules here, not in `sync.ts` |
| `src/lib/sync.ts` | The plumbing that runs the merge against Supabase |
| `src/lib/storage.ts` | Guest localStorage. Shape mirrors the `autosaves` row so the merge compares like with like |
| `src/lib/autosave.ts` | Session ↔ saved record, both directions |
| `src/lib/puzzles.ts` | Which puzzle to play: today's edition, practice selection, attempt tracking |
| `src/lib/settings.ts` | Settings, in the `profiles` columns' shape |
| `src/lib/streak.ts` | Streak derivation, shared by guest and signed-in |
| `src/lib/redirect.ts` | The auth-callback whitelist |
| `src/lib/theme.ts` | Theme choice and the pre-hydration script |
| `src/proxy.ts` | Session refresh. Guards nothing — every route is playable signed out |

Rules live in `@nonet/engine`, never here. If you are about to decide what a
board *means* — finished, locked, still assisted — that belongs in the engine
(DECISIONS.md NONET-8, NONET-15).

## Sign-in, locally

Copy `.env.example` to `.env.local` and fill it from `supabase status`. With it
absent the app still runs: both client factories return `null` and the auth
screen says sign-in is unavailable.

The magic link arrives in Mailpit at http://127.0.0.1:54324.

## Relative imports carry no extension

Turbopack does not resolve a `.js` specifier to a `.ts` file, so relative imports
here are extensionless and app code imports through the `@/` alias. **`packages/engine`
is the exception** — it names `.ts`, because Deno consumes it in the edge functions
and cannot resolve an extensionless specifier. `.ts` is the one form all three
resolvers accept (DECISIONS.md NONET-16).

`@/` is configured in two places: `tsconfig.json` for Next, and `vitest.config.ts`
for the tests. Vitest does not read tsconfig paths.

## If a style does nothing

Check the generated stylesheet for the rule before debugging anything else. The
cleared namespaces mean `bg-red-500`, `p-4` and `md:` produce **no CSS at all**,
which looks exactly like a class that has no effect. This hid a bug that broke
every fixed overlay in the app (DECISIONS.md NONET-19).

```js
[...document.styleSheets].flatMap(s => [...s.cssRules]).map(r => r.cssText)
  .filter(t => t.includes('inset-0'))
```
