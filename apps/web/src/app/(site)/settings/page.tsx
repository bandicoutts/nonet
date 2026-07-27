import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return <PageStub kicker="Settings" note="Theme, input mode, checking, timer visibility, highlighting and auto-advance, plus the account block." />;
}
