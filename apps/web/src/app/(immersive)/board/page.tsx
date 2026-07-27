import type { Metadata } from 'next';
import { DailyBoard } from '@/components/DailyBoard';

export const metadata: Metadata = { title: 'Board' };

/**
 * The board is immersive: no site nav, and the only way out is the back control
 * labelled for its origin.
 *
 * The daily is resolved on the client, because it is derived from the date and
 * needs no round trip — see `DailyBoard`.
 */
export default function Page() {
  return (
    <div className="mx-auto w-full px-m py-s drawer:px-2xl rail:px-4xl">
      <DailyBoard />
    </div>
  );
}
