import type { Metadata } from 'next';
import { SettingsScreen } from '@/components/SettingsScreen';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Settings.
 *
 * The store, the columns and the sync shape existed from NONET-17; this is the
 * screen that finally changes them, and the board now reads the four that were
 * being stored and honoured by nothing (NONET-24).
 */
export default function Page() {
  return <SettingsScreen />;
}
