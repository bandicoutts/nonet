'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { MobileDrawer } from './MobileDrawer';
import { createClient } from '@/lib/supabase/client';

/**
 * The browsing-screen header.
 *
 * Wordmark, then Today · Archive · Record — three items, because practice is a
 * section of Home rather than a destination (NONET-2).
 *
 * Below 768 the nav collapses into the drawer and the header becomes wordmark
 * plus MENU, which is what layout.md specifies at 390.
 */
const NAV: ReadonlyArray<{ href: Route; label: string }> = [
  { href: '/', label: 'Today' },
  { href: '/archive', label: 'Archive' },
  { href: '/record', label: 'Record' },
];

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  // Resolved here rather than passed down, so the drawer stays a pure component
  // and can be tested without a Supabase client.
  useEffect(() => {
    const supabase = createClient();
    if (supabase === null) return;

    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const signOut = async (options: { scope: 'local' }) => {
    const supabase = createClient();
    if (supabase === null) return;
    await supabase.auth.signOut(options);
    window.location.reload();
  };

  return (
    <header className="flex items-center gap-xs pt-ml drawer:gap-ml drawer:pt-xl">
      <Link href="/" className="type-wordmark text-fg no-underline">
        NONET
      </Link>

      <div className="ml-auto flex items-center">
        <nav
          aria-label="Primary"
          className="hidden items-baseline gap-sm drawer:flex rail:gap-l"
        >
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

        <MobileDrawer email={email} signOut={signOut} />
      </div>
    </header>
  );
}
