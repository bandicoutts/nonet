import type { Metadata } from 'next';
import { BoardScreen } from '@/components/BoardScreen';

export const metadata: Metadata = { title: 'Board' };

/**
 * The board is immersive: no site nav, and the only way out is the back control
 * labelled for its origin.
 *
 * The puzzle comes from a fixed seed until the daily edge function and
 * localStorage resume land — the next two items in Phase 3.
 */
export default function Page() {
  return (
    <div className="mx-auto w-full px-m py-s drawer:px-2xl rail:px-4xl">
      <BoardScreen />
    </div>
  );
}
