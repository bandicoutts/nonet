# assets

Files read from the filesystem at build time. Not `public/` — nothing here is
served to a browser.

## `Archivo-Bold.ttf`

A **static instance** of Archivo at weight 700, from Google Fonts (OFL).

It is here because **the app's own copy of Archivo cannot be used for this.**
`next/font` ships `woff2`, and satori — the renderer behind `next/og` — reads
`ttf`, `otf` and `woff` only. Both failure modes were measured rather than
assumed:

| Tried | Result |
|---|---|
| The `woff2` under `.next/static/media` | `Unsupported OpenType signature wOF2` |
| Archivo's **variable** `ttf` (the default Google Fonts download) | `Cannot read properties of undefined (reading '256')` |
| This file — a static instance, weight 700 | Renders |

So a variable font is not a smaller version of the right answer either: the
static instance is the only form that works. If you are tempted to delete this
and point the OG route at the font the browser already downloads, that is why
it will not work.

Regenerate with the URL in the `@font-face` block Google serves for
`https://fonts.googleapis.com/css2?family=Archivo:wght@700` when fetched with a
browser user agent — the `format('truetype')` source.
