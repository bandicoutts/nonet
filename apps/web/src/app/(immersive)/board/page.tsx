import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/og';
import { DailyBoard } from '@/components/DailyBoard';
import { PuzzleBoard } from '@/components/PuzzleBoard';
import { parsePuzzleRef, parseReplay } from '@/lib/puzzles';

/*
 * The board's own description, because "one sudoku a day" is the product and
 * this route is the thing itself — and it serves practice and archive puzzles
 * too, so it cannot claim to be today's.
 */
const DESCRIPTION = 'The grid. Three mistakes, three hints, and a clock you can hide.';

export const metadata: Metadata = {
  title: 'Board',
  description: DESCRIPTION,
  alternates: { canonical: '/board' },
  openGraph: { title: 'Nonet — the board', description: DESCRIPTION, url: '/board', images: [OG_IMAGE] },
  twitter: { title: 'Nonet — the board', description: DESCRIPTION },
};

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
  const params = await searchParams;
  const puzzleRef = parsePuzzleRef(params);

  return (
    <div className="mx-auto w-full px-m py-s drawer:px-2xl rail:px-4xl">
      {puzzleRef === null ? <DailyBoard /> : <PuzzleBoard puzzleRef={puzzleRef} replay={parseReplay(params)} />}
    </div>
  );
}
