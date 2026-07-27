import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'Record' };

export default function Page() {
  return <PageStub kicker="Record" note="A non-interactive year heat strip, streak and stat blocks, and a separate section for practice. Everything here is derived from solves." />;
}
