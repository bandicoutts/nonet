import type { Metadata } from 'next';
import { ArchiveScreen } from '@/components/ArchiveScreen';

export const metadata: Metadata = { title: 'Archive' };

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
