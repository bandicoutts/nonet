'use client';

import { useEffect, useState } from 'react';

/**
 * Offline.
 *
 * **No dismiss**, which is the design's call and the right one: the message is
 * not an interruption to be cleared but a statement of fact that stops being
 * true on its own. It also sidesteps the one WCAG AA target-size breach
 * `layout.md` measured — the notice dismiss at ~22px against a 24px minimum
 * (NONET-9) — by not having a control at all.
 *
 * What it says matters more than that it appears: everything here works
 * offline. The daily is generated in the browser (NONET-16), progress is
 * written to localStorage, and Supabase is only involved in recording a solve
 * or reading a percentile. So the copy reassures rather than warns.
 *
 * Copy verbatim from `design/export/copy.md`.
 */
export function OfflineBanner() {
  /*
   * Starts online, always.
   *
   * `navigator.onLine` does not exist during the server render, and guessing
   * offline would flash the banner on every first paint for everyone. The
   * effect corrects it immediately if it is wrong, and being briefly silent
   * about a real outage is far cheaper than crying wolf on every page load.
   */
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <p
      /* Announced, not just drawn — a player using a screen reader gets no
         warning from a colour change at the top of the page. Polite, because
         losing a connection is not urgent when nothing is lost by it. */
      role="status"
      aria-live="polite"
      className="type-mono-label m-0 w-full bg-fg px-ml py-2xs text-center text-bg"
    >
      Offline — your puzzle is saved here and will sync when you reconnect
    </p>
  );
}
