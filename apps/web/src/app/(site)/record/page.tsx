import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/og';
import { RecordScreen } from '@/components/RecordScreen';

const DESCRIPTION = 'Streaks, completion and times, derived from every solve.';

export const metadata: Metadata = {
  title: 'Record',
  description: DESCRIPTION,
  alternates: { canonical: '/record' },
  openGraph: { title: 'Nonet — record', description: DESCRIPTION, url: '/record', images: [OG_IMAGE] },
  twitter: { title: 'Nonet — record', description: DESCRIPTION },
};

/**
 * Record: streaks, completion and times, all derived from the solve rows.
 *
 * Nothing on this page is stored (NONET-13), so it cannot drift from the
 * figures Home and the result screen show.
 */
export default function Page() {
  return <RecordScreen />;
}
