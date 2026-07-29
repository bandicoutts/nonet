import type { MetadataRoute } from 'next';
import { palettes } from '@nonet/design';

/**
 * The web manifest, which is what makes a daily game installable.
 *
 * **The colours are read from the tokens, not typed in.** The literal that used
 * to sit in `viewport.themeColor` had already drifted — it said `#101215` where
 * the dark ground is `#131518` — which is the failure mode a token exists to
 * prevent.
 *
 * **A manifest colour cannot follow the theme, and the meta tag can.** There is
 * one `theme_color` field and no media query in the manifest spec, while
 * `<meta name="theme-color">` takes a `prefers-color-scheme` media attribute and
 * is what a browser uses for its chrome when both are present. So the live
 * chrome is correct in both themes (see `viewport` in `layout.tsx`), and the
 * single value here governs only the install: the splash screen, and the tile
 * in the task switcher.
 *
 * Given one value, it is the **dark** ground. A light splash in front of a dark
 * app is a flash of white, which is the failure `THEME_SCRIPT` exists to prevent
 * on the web side; the reverse is a flash of dark, which is milder. It also
 * matches the icons, so the tile and the splash are the same colour rather than
 * two.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nonet — one sudoku a day',
    short_name: 'Nonet',
    description: 'One sudoku a day, the same grid for everyone.',
    start_url: '/',
    display: 'standalone',
    background_color: palettes.dark['--bg'],
    theme_color: palettes.dark['--bg'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /*
       * Separate files rather than `purpose: 'any maskable'`. A single icon
       * claiming both is drawn full-bleed *and* cropped to a circle, so the
       * glyph loses its corners on Android — the maskable pair carries the
       * safe-zone padding instead.
       */
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
