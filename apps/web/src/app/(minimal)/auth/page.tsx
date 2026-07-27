import type { Metadata } from 'next';
import { PageStub } from '@/components/chrome/PageStub';

export const metadata: Metadata = { title: 'Sign in' };

export default function Page() {
  return (
    <PageStub
      kicker="Sign in"
      note="Magic link, and the post-sign-in merge summary. Signing in is always optional — it protects progress, it never gates play."
    />
  );
}
