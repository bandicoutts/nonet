'use client';

/**
 * Who is playing, and how they stop.
 *
 * Extracted rather than duplicated. `SiteHeader` resolved this for the drawer
 * and `SettingsScreen` did not resolve it at all — it stated "Playing as a
 * guest" unconditionally, so a signed-in player was told their progress was
 * kept in this browser only, which is the opposite of what signing in does.
 * Two components needing the same answer is the case a hook exists for, and
 * the second copy is exactly where the two would have drifted.
 *
 * It deliberately does **not** hold the answer in a context or a module-level
 * cache. Each caller asks once on mount; there are two of them on a page at
 * most, and `getUser` is served from the client's own session. A shared store
 * would buy nothing and would have to be invalidated on sign-out, which is the
 * bug it would be introducing.
 */
import { useCallback, useEffect, useState } from 'react';
import { createClient } from './supabase/client';

export interface Account {
  /** The signed-in address, or `null` for a guest. */
  readonly email: string | null;
  /**
   * Whether the question has been answered yet.
   *
   * `email` is `null` both before the answer arrives and for a guest, and a
   * screen that says "Playing as a guest" needs to tell those apart — claiming
   * it before asking is how the Settings screen was wrong in the first place.
   *
   * Unconfigured Supabase resolves immediately: there is no session to fetch,
   * so a guest never sees a pending state.
   */
  readonly resolved: boolean;
  /**
   * Local scope, always. The default revokes every session on every device,
   * which is almost never what "sign out" means to someone closing one browser
   * (global CLAUDE.md). The option is still a parameter so a caller states it
   * at the call site and a test can assert what was passed.
   */
  readonly signOut: (options: { scope: 'local' }) => Promise<void>;
}

export function useAccount(): Account {
  const [email, setEmail] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (supabase === null) {
      // Guest-first: unconfigured is a normal state, and the answer is "guest".
      setResolved(true);
      return;
    }

    // Guarded, because a player can leave a page mid-request and setting state
    // on an unmounted component is a warning that hides real ones.
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!live) return;
      setEmail(data.user?.email ?? null);
      setResolved(true);
    });

    return () => {
      live = false;
    };
  }, []);

  const signOut = useCallback(async (options: { scope: 'local' }) => {
    const supabase = createClient();
    if (supabase === null) return;
    await supabase.auth.signOut(options);
    // A full reload rather than a state update: every screen reads storage on
    // mount, and after a sign-out the answer has changed for all of them.
    window.location.reload();
  }, []);

  return { email, resolved, signOut };
}
