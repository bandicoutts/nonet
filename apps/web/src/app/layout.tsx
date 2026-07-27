import type { Metadata, Viewport } from 'next';
import { TokenStyles } from '@/components/TokenStyles';
import { mono, sans } from '@/lib/fonts';
import { THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Nonet', template: '%s · Nonet' },
  description: 'One sudoku a day, the same grid for everyone.',
  applicationName: 'Nonet',
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
        {children}
      </body>
    </html>
  );
}
