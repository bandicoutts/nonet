import type { Metadata } from 'next';
import { RecordScreen } from '@/components/RecordScreen';

export const metadata: Metadata = { title: 'Record' };

/**
 * Record: streaks, completion and times, all derived from the solve rows.
 *
 * Nothing on this page is stored (NONET-13), so it cannot drift from the
 * figures Home and the result screen show.
 */
export default function Page() {
  return <RecordScreen />;
}
