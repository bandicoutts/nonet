'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MergeSummary } from './MergeSummary';
import { createClient } from '@/lib/supabase/client';
import { syncAfterSignIn } from '@/lib/sync';
import type { SyncResult } from '@/lib/sync';

/**
 * Runs the merge once, after the callback lands.
 *
 * On the client, because the guest's half of the merge lives in localStorage
 * and the server has never seen it. Triggered by `?merged=1`, which the auth
 * callback adds — a marker in the URL rather than state, so a reload during the
 * sync retries it rather than losing it.
 *
 * The parameter is stripped as soon as the sync starts, so a player who
 * bookmarks or shares the URL does not re-run a merge on someone else's visit.
 */
export function PostSignIn() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [result, setResult] = useState<SyncResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (params.get('merged') !== '1' || started.current) return;
    started.current = true;

    const supabase = createClient();
    if (supabase === null) return;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId === undefined) return;

      try {
        setResult(await syncAfterSignIn(supabase, userId));
      } catch {
        // A failed merge is not a failed sign-in. The player keeps playing, and
        // signing in again retries it — every write in the sync is an upsert
        // for exactly this reason.
      } finally {
        router.replace(pathname);
      }
    })();
  }, [params, pathname, router]);

  if (result === null) return null;

  return <MergeSummary result={result} onDismiss={() => setResult(null)} />;
}
