import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'Today' };

export default function Page() {
  return <PageStub kicker="Daily sudoku" note="The daily hero, the streak band and the practice section land here. Practice is a section of Home, not a route of its own." />;
}
