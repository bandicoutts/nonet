'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { THEME_CHOICES, readTheme, writeTheme } from '@/lib/theme';
import type { ThemeChoice } from '@/lib/theme';
import { readSettings, writeSettings } from '@/lib/settings';

const PRIMARY: ReadonlyArray<{ href: Route; label: string }> = [
  { href: '/', label: 'Today' },
  { href: '/archive', label: 'Archive' },
  { href: '/record', label: 'Record' },
];

const SECONDARY: ReadonlyArray<{ href: Route; label: string }> = [
  { href: '/settings', label: 'Settings' },
  { href: '/how-to-play', label: 'How to play' },
  { href: '/about', label: 'About' },
];

const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/** Everything a Tab can land on. Used to cycle focus rather than lose it. */
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface MobileDrawerProps {
  /** The signed-in address, or null for a guest. */
  readonly email: string | null;
  /** Injected so the scope can be asserted without a Supabase client. */
  readonly signOut?: (options: { scope: 'local' }) => Promise<unknown>;
}

/**
 * The mobile menu.
 *
 * A **full-frame overlay in `--bg`, hairline-ruled — an editorial contents
 * page, not a side sheet borrowed from someone else's app** (DESIGN.md). The
 * trigger is three stacked hairlines, which is the product's own rule language
 * rather than a hamburger, plus a mono MENU label so it is named and not only
 * drawn.
 *
 * Everything below the visuals is new work. The prototype renders every control
 * as a `<span onClick>` and its accessibility tree comes back empty, so the
 * dialog role, the focus trap, the Escape handling and the scroll lock are the
 * build's to write and to prove (NONET-2).
 */
export function MobileDrawer({ email, signOut }: MobileDrawerProps) {
  const [isOpen, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>('system');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Focus goes back where it came from, or a keyboard player is dropped at
    // the top of a page they did not navigate to.
    triggerRef.current?.focus();
  }, []);

  /*
   * Read on open rather than on mount: there is no localStorage during the
   * server render, and the value can have changed on the Settings screen since.
   *
   * **`readTheme` is the read source, not `readSettings().theme`.** The choice
   * is stored twice — under its own key, and again in the settings blob — and
   * the standalone key is the one that decides what the player actually sees:
   * a blocking script in `<head>` reads it before any module loads, because it
   * cannot parse JSON and a light choice must not flash dark. The blob copy
   * exists so the setting syncs to `profiles` with the other six.
   *
   * This read used to come off the blob while Settings read the key, so two
   * surfaces answered the same question from two stores with nothing
   * reconciling them (NONET-35).
   */
  useEffect(() => {
    if (isOpen) setTheme(readTheme());
  }, [isOpen]);

  // No page scroll behind the overlay (DESIGN.md).
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Focus lands on the first item in the drawer.
  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [isOpen]);

  /**
   * The trap.
   *
   * Without it, Tab walks out of the overlay into a page the player cannot see
   * and cannot get back from — the drawer is still covering it. Wrapping at
   * both ends is what makes the overlay a place rather than a layer.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const chooseTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    // Both, and in this order: the attribute is what the page reads now, the
    // settings record is what the next load and the account read later. The
    // key is the read source (see the open effect); the blob copy is for sync.
    writeTheme(choice);
    writeSettings({ ...readSettings(), theme: choice });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="type-control flex min-h-(--tap-target-min) items-center gap-xs text-fg drawer:hidden"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {/* Three stacked hairlines — a picture of the menu, not its label. */}
        <span aria-hidden="true" className="flex w-[18px] flex-col gap-[3px]">
          <span className="h-px w-full bg-fg" />
          <span className="h-px w-full bg-fg" />
          <span className="h-px w-full bg-fg" />
        </span>
        Menu
      </button>

      {isOpen ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg px-ml pt-ml pb-2xl"
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center justify-between border-b border-line pb-s">
            <span className="type-wordmark text-fg">NONET</span>
            <button
              type="button"
              className="type-control flex min-h-(--tap-target-min) items-center text-fg2 hover:text-fg"
              onClick={close}
            >
              Close
            </button>
          </div>

          <nav aria-label="Primary" className="flex flex-col">
            {PRIMARY.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                /* 64px rows, per layout.md — the primary nav is the reason the
                   drawer exists, so it is the largest thing in it. */
                className="type-display flex min-h-[64px] items-center border-b border-line2 text-fg no-underline"
              >
                {label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Secondary" className="mt-l flex flex-col">
            {SECONDARY.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="type-body flex min-h-[48px] items-center border-b border-line2 text-fg2 no-underline"
              >
                {label}
              </Link>
            ))}
          </nav>

          <section className="mt-l" aria-labelledby="drawer-theme">
            <h2 id="drawer-theme" className="type-mono-label text-fg3-text">
              Theme
            </h2>
            <div role="group" aria-labelledby="drawer-theme" className="mt-s flex gap-xs">
              {THEME_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={theme === choice}
                  onClick={() => chooseTheme(choice)}
                  className={
                    'type-chip min-h-[48px] flex-1 cursor-pointer border px-s ' +
                    (theme === choice
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line bg-transparent text-fg2')
                  }
                >
                  {THEME_LABELS[choice]}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-l" aria-labelledby="drawer-account">
            <h2 id="drawer-account" className="type-mono-label text-fg3-text">
              Account
            </h2>

            {email === null ? (
              <div className="mt-s flex flex-col gap-xs">
                <p className="type-body-small text-fg2">Progress is kept in this browser only.</p>
                <Link
                  href="/auth"
                  onClick={close}
                  className="type-button flex min-h-[48px] w-full items-center justify-center bg-fg text-bg no-underline"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <div className="mt-s flex flex-col gap-xs">
                <p className="type-body-small text-fg2">{email}</p>
                <button
                  type="button"
                  className="type-button flex min-h-[48px] w-full items-center justify-center border border-line text-fg2"
                  onClick={() => {
                    // Local scope. The default revokes every session on every
                    // device, which is almost never what "sign out" means to
                    // someone closing one browser.
                    void signOut?.({ scope: 'local' });
                    close();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </section>

          <p className="type-body-small text-fg3-text mt-auto pt-l">© 2026 Nonet</p>
        </div>
      ) : null}
    </>
  );
}
