import Link from 'next/link';
import type { Route } from 'next';

/**
 * The browsing-screen header: wordmark, then Today · Archive · Record.
 *
 * Three nav items, per NONET-2 — practice is a section of Home, not a
 * destination. The mobile drawer that layout.md specifies below 768 is not
 * built yet, so the nav simply stays visible at every width rather than
 * collapsing behind a Menu trigger that would do nothing. Every route is
 * reachable at every viewport in the meantime, which is the rule that matters.
 */
const NAV: ReadonlyArray<{ href: Route; label: string }> = [
  { href: '/', label: 'Today' },
  { href: '/archive', label: 'Archive' },
  { href: '/record', label: 'Record' },
];

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-baseline gap-xs pt-ml drawer:gap-ml drawer:pt-xl">
      <Link href="/" className="type-wordmark text-fg no-underline">
        NONET
      </Link>

      <nav aria-label="Primary" className="ml-auto flex items-baseline gap-sm rail:gap-l">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="type-control text-fg2 no-underline hover:text-fg"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
