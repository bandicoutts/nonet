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

  /*
   * Keyed by the puzzle, because a board is not a view of a ref — it is a
   * sitting at one puzzle, and almost everything it owns is established once
   * on mount: the generated grid, the session, the clock, and the refs that
   * remember whether this board has already been restored and recorded.
   *
   * An App Router navigation from one puzzle straight to another is the same
   * element in the same position with new props, so React reconciles rather
   * than remounts and every one of those survives. Measured before this key
   * existed: switching refs left the previous puzzle's givens on screen and
   * the previous puzzle's time on the clock.
   *
   * A key is the whole fix, and it is the right one — the alternative is an
   * effect per piece of mounted state, each of which has to remember to reset
   * itself. Nothing changes for the daily, whose ref is fixed for the life of
   * the page.
   */
  return (
    <BoardScreen
      key={refParams(puzzleRef)}
      puzzleRef={puzzleRef}
      onSolved={onSolved}
      replay={replay}
    />
  );
}
