import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/og';
import { redirect } from 'next/navigation';
import { SolvedView } from '@/components/SolvedView';
import { parsePuzzleRef } from '@/lib/puzzles';

/*
 * Written for a stranger, not for the player who just solved it.
 *
 * A shared link goes to the root (`lib/site.ts`), and anyone opening `/solved`
 * without a solve of their own is redirected to Home — so the card that shows
 * has to sell the game rather than describe a result the reader cannot see.
 */
const DESCRIPTION = 'One grid a day, the same one for everyone. See how today went.';

export const metadata: Metadata = {
  title: 'Solved',
  description: DESCRIPTION,
  alternates: { canonical: '/solved' },
  openGraph: { title: 'Nonet', description: DESCRIPTION, url: '/solved', images: [OG_IMAGE] },
  twitter: { title: 'Nonet', description: DESCRIPTION },
};

/**
 * The result screen: time, mistakes, percentile where one was earned, and share.
 *
 * Which puzzle it describes travels in the URL, so the screen survives a reload
 * and the browser Back button behaves. The solve itself is not in the URL — it
 * is read from storage, which is the only place it exists for a guest, and is
 * the same record the sign-in merge uploads.
 *
 * An unparseable ref is not an error screen: there is no puzzle at that address,
 * so the player goes to the one there is.
 */
export default async function Page({
  searchParams,
}: {
  // Next 16: `searchParams` is a promise and must be awaited.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const puzzleRef = parsePuzzleRef(await searchParams);
  if (puzzleRef === null) redirect('/');

  return <SolvedView puzzleRef={puzzleRef} />;
}
