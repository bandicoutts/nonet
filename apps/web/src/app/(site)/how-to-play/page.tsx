import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'How to play' };

export default function Page() {
  return <PageStub kicker="How to play" note="The rules, the two input modes, notes, mistakes and hints." />;
}
