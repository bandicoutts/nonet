import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'About' };

export default function Page() {
  return <PageStub kicker="About" note="What Nonet is, who made it and how to get in touch." />;
}
