import type { Metadata } from 'next';
import { SignInForm } from '@/components/SignInForm';
import { problemFor } from '@/lib/auth-errors';
import { safeRedirect } from '@/lib/redirect';

export const metadata: Metadata = { title: 'Sign in', alternates: { canonical: '/auth' } };

/**
 * `searchParams` is a Promise in Next 16, so it is awaited. The `next` value is
 * whitelisted here as well as in the callback — it reaches the client
 * component, and a value that never was a route should not travel. `error` is
 * whitelisted the same way by `problemFor`, which maps the three codes
 * `auth/callback` can send and ignores anything else, so a crafted URL cannot
 * put text on the page.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <section className="pt-xl drawer:pt-3xl">
      <SignInForm next={safeRedirect(next)} problem={problemFor(error)} />
    </section>
  );
}
