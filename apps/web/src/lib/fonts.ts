import { Archivo, IBM_Plex_Mono } from 'next/font/google';

/**
 * The two families the design language names: a grotesque for display and UI,
 * a mono for kickers, timers and metadata (DESIGN.md).
 *
 * Self-hosted through `next/font` rather than linked from Google, so there is
 * no third-party request on first paint and no swap-in shift.
 *
 * `next/font` gives each face a generated family name, which cannot be the
 * literal `Archivo` the token sheet names — so the app points `--font-sans` and
 * `--font-mono` at these variables in `globals.css`. The token still decides
 * *which* family a role uses; this only supplies the loaded face behind it.
 */
export const sans = Archivo({
  subsets: ['latin'],
  // The four weights `WEIGHTS` exports: regular, medium, semibold, bold.
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-archivo',
});

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
});
