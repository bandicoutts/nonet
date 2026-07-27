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

## Relative imports carry no extension

Turbopack does not resolve a `.js` specifier to a `.ts` file, so relative imports
here and in the workspace packages are extensionless. App code imports through
the `@/` alias.
