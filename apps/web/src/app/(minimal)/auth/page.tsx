import type { Metadata } from 'next';
import { SignInForm } from '@/components/SignInForm';
import { safeRedirect } from '@/lib/redirect';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * `searchParams` is a Promise in Next 16, so it is awaited. The `next` value is
 * whitelisted here as well as in the callback — it reaches the client
 * component, and a value that never was a route should not travel.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <section className="pt-xl drawer:pt-3xl">
      <SignInForm next={safeRedirect(next)} />
    </section>
  );
}
