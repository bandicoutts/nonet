import type { Metadata, Viewport } from 'next';
import { TokenStyles } from '@/components/TokenStyles';
import { mono, sans } from '@/lib/fonts';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SITE_URL } from '@/lib/site';
import { THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

/** Said once here, inherited everywhere, overridden only where a route differs. */
const DESCRIPTION = 'One sudoku a day, the same grid for everyone.';

export const metadata: Metadata = {
  /*
   * **Everything relative in `metadata` is resolved against this.**
   *
   * Without it Next 16 does not warn and does not fall back to localhost — it
   * emits the tags exactly as written, so `og:url` ships as `content="/"`.
   * Open Graph requires an absolute URL, so a relative one is not a smaller
   * version of the right answer; it is a tag every scraper is entitled to drop.
   * Checked in the build output rather than assumed.
   *
   * `SITE_URL` rather than a literal, so a custom domain is still one line
   * (NONET-30).
   */
  metadataBase: new URL(SITE_URL),
  title: { default: 'Nonet', template: '%s · Nonet' },
  description: DESCRIPTION,
  applicationName: 'Nonet',
  /*
   * **No canonical here, deliberately.** Metadata inherits, and a canonical is
   * the one field where inheriting is worse than absent: every route that did
   * not override it would name the *home page* as its canonical, which tells a
   * crawler that Archive, Record and Settings are duplicates of `/` and should
   * not be indexed on their own. Each route declares its own; `/` declares it
   * in `(site)/page.tsx` with the others.
   */
  /*
   * The share text a player copies carries a bare link (`lib/site.ts`), so
   * these tags are what turns that link into something legible in a message.
   * They describe the product, not the sender's result — the link points at
   * the root on purpose, because a recipient has no solve of their own to show.
   */
  openGraph: {
    type: 'website',
    siteName: 'Nonet',
    // The copy is British. `og:locale` has no bare `en`, and the alternative
    // default is `en_US`, which is the less accurate of the two.
    locale: 'en_GB',
    url: '/',
    title: 'Nonet',
    description: DESCRIPTION,
  },
  /*
   * `summary`, not `summary_large_image`: there is no OG image yet, and the
   * large card renders as an empty slab when the image is missing rather than
   * degrading to the small one.
   */
  twitter: {
    card: 'summary',
    title: 'Nonet',
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Both grounds, so the browser chrome matches whichever theme resolves.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1F2F3' },
    { media: '(prefers-color-scheme: dark)', color: '#101215' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/*
         * Blocking, and deliberately so. `data-theme` has to be on <html>
         * before the first paint or a player who chose light gets a dark flash
         * on every load — the one way the token sheet's "explicit choice wins"
         * can still be defeated. `suppressHydrationWarning` above is because
         * this script writes an attribute React did not render.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg text-fg font-sans">
        <TokenStyles />
        {/* Above everything, on every route: losing a connection mid-puzzle is
            exactly when a player needs telling that nothing is lost. */}
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
