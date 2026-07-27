'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BoardScreen } from './BoardScreen';
import { dailyRef, refParams } from '@/lib/puzzles';
import type { PuzzleRef } from '@/lib/storage';

/**
 * Today's edition, resolved on the client.
 *
 * The daily is derived entirely from the date (NONET-16), so the browser mints
 * the identical grid the publish job did, without a round trip. That is what
 * lets the daily be played with Supabase down and a guest never touch the
 * network — the row is only needed to record a solve or read a percentile.
 *
 * Resolved once, in state, rather than recomputed on every render: the edition
 * turns over at 00:05 UTC and a board that swapped puzzle underneath a player
 * mid-solve would be worse than one that is briefly a few minutes stale.
 */
export function DailyBoard() {
  const [ref] = useState<PuzzleRef>(() => dailyRef());
  const router = useRouter();

  /*
   * `replace`, not `push`. The board is finished and its autosave is cleared,
   * so Back from the result would land on a puzzle that cannot be resumed and
   * would deal itself fresh — offering a solved player their solved puzzle
   * again, unsolved.
   */
  const onSolved = useCallback(
    (solved: PuzzleRef) => router.replace(`/solved?${refParams(solved)}`),
    [router],
  );

  return <BoardScreen puzzleRef={ref} onSolved={onSolved} />;
}
