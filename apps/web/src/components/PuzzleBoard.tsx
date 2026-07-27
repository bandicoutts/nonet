'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BoardScreen } from './BoardScreen';
import { refParams } from '@/lib/puzzles';
import type { PuzzleRef } from '@/lib/storage';

/**
 * Any puzzle, wired to the router.
 *
 * The board itself does not know where a finished puzzle goes — that is
 * injected, so the dwell is testable without a router (NONET-20). This is the
 * only place that decision is made, for the daily and for practice alike.
 */
export function PuzzleBoard({ puzzleRef, replay = false }: { puzzleRef: PuzzleRef; replay?: boolean }) {
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

  return <BoardScreen puzzleRef={puzzleRef} onSolved={onSolved} replay={replay} />;
}
