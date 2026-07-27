import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'Archive' };

export default function Page() {
  return <PageStub kicker="Archive" note="A navigable month grid carrying difficulty per cell, plus the filter rail at 1100 and above. Archive solves record stats but never extend a streak." />;
}
