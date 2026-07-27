import type { Metadata } from 'next';
import { DailyBoard } from '@/components/DailyBoard';
import { PuzzleBoard } from '@/components/PuzzleBoard';
import { parsePuzzleRef } from '@/lib/puzzles';

export const metadata: Metadata = { title: 'Board' };

/**
 * The board is immersive: no site nav, and the only way out is the back control
 * labelled for its origin.
 *
 * A puzzle may be named in the URL — that is how practice is played, and how a
 * ref survives a reload. With no ref it is today's edition, resolved on the
 * client because the daily derives from the date and needs no round trip
 * (NONET-16).
 *
 * An unparseable ref falls back to the daily rather than erroring: there is
 * always a puzzle to play, which is the whole promise of guest-first.
 */
export default async function Page({
  searchParams,
}: {
  // Next 16: `searchParams` is a promise and must be awaited.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const puzzleRef = parsePuzzleRef(await searchParams);

  return (
    <div className="mx-auto w-full px-m py-s drawer:px-2xl rail:px-4xl">
      {puzzleRef === null ? <DailyBoard /> : <PuzzleBoard puzzleRef={puzzleRef} />}
    </div>
  );
}
