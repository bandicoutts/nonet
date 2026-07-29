import type { Metadata } from 'next';
import { ArchiveScreen } from '@/components/ArchiveScreen';

const DESCRIPTION = 'Every edition since No. 1, all of them free to play.';

export const metadata: Metadata = {
  title: 'Archive',
  description: DESCRIPTION,
  alternates: { canonical: '/archive' },
  openGraph: { title: 'Nonet — archive', description: DESCRIPTION, url: '/archive' },
  twitter: { title: 'Nonet — archive', description: DESCRIPTION },
};

/**
 * Archive: every edition since No. 1.
 *
 * Each one is derived from its date (NONET-16), so the page needs no database
 * and works with Supabase down — the same property that lets the daily be
 * played offline.
 */
export default function Page() {
  return <ArchiveScreen />;
}
