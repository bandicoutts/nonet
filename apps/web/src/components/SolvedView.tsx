'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SolvedScreen } from './SolvedScreen';
import { fetchPercentile } from '@/lib/percentile';
import { createClient } from '@/lib/supabase/client';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

/**
 * Wires the result screen to the router and to Supabase.
 *
 * Kept apart from `SolvedScreen` so the screen itself takes its two outside
 * effects — where to go, and where the percentile comes from — as props. That is
 * what makes it testable without a router or a database, which is most of what
 * it needs to be right about.
 */
export function SolvedView({ puzzleRef }: { puzzleRef: PuzzleRef }) {
  const router = useRouter();

  const getPercentile = useCallback(
    (solve: GuestSolve) => fetchPercentile(createClient(), solve.ref, solve.durationMs),
    [],
  );

  return (
    <SolvedScreen
      puzzleRef={puzzleRef}
      getPercentile={getPercentile}
      /* `replace`, not `push`: there is nothing to describe here, so Back
         should not walk into it again. */
      onLeave={useCallback(() => router.replace('/'), [router])}
    />
  );
}
