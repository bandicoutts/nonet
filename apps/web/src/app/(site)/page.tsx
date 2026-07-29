import type { Metadata } from 'next';
import { HomeScreen } from '@/components/HomeScreen';

export const metadata: Metadata = { title: 'Today', alternates: { canonical: '/' } };

/**
 * Home: the daily hero, the streak band and the practice section.
 *
 * Practice is a section here, not a route — there is no `/practice` (NONET-2).
 */
export default function Page() {
  return <HomeScreen />;
}
