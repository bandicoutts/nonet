/**
 * The share card, described once.
 *
 * `opengraph-image.tsx` reads its `size` and `alt` from here, and any route
 * that declares its own `openGraph` block names `OG_IMAGE` in it.
 *
 * **That second part is not optional.** Next merges metadata shallowly, so a
 * route declaring `openGraph` replaces the parent's object outright — including
 * the image the file-based route contributed. Measured: before this existed,
 * `/board`, `/solved`, `/archive` and `/record` were the four routes with their
 * own OG block and the four with no card at all, while `/about` and `/settings`
 * inherited one by doing nothing.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_ALT = 'Nonet — one sudoku a day';

/**
 * Relative on purpose: `metadataBase` resolves it, so the address stays in
 * `lib/site.ts` (NONET-30). No cache-busting hash, unlike the one Next appends
 * for the inherited case — the card changes once a day and `revalidate` is what
 * governs that.
 */
export const OG_IMAGE = {
  url: '/opengraph-image',
  ...OG_SIZE,
  alt: OG_ALT,
} as const;
