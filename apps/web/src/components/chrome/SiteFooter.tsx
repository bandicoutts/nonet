import Link from 'next/link';
import type { Route } from 'next';

/**
 * Present at every viewport, because Settings, About and How to play are
 * reachable from nowhere else once the nav is down to three items
 * (ARCHITECTURE.md: every route must be reachable from within the product).
 *
 * The links are set to the 44px target rather than layout.md's measured 24 —
 * NONET-9 records that as one of the breaches to fix, not to reproduce.
 */
const LINKS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: '/settings', label: 'Settings' },
  { href: '/about', label: 'About' },
  { href: '/how-to-play', label: 'How to play' },
];

export function SiteFooter() {
  return (
    <footer className="mt-2xl border-t border-line2 pt-ml pb-2xl drawer:mt-3xl">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <small className="type-body-small text-fg3-text">© 2026 Nonet</small>

        <nav aria-label="Secondary" className="flex flex-wrap items-center">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="type-body-small text-fg3-text flex min-h-(--tap-target-min) items-center px-xs no-underline hover:text-fg first:-ml-xs"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
