import Link from 'next/link';
import type { Metadata } from 'next';
import { MinimalChrome } from '@/components/chrome/MinimalChrome';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <MinimalChrome>
      <section className="pt-xl drawer:pt-3xl">
        <p className="type-hero-number text-fg">404</p>
        <p className="type-body text-fg2 mt-s max-w-[52ch]">
          There is no puzzle at this address.
        </p>
        <Link
          href="/"
          className="type-button text-fg border-rule mt-ml inline-flex min-h-(--tap-target-min) items-center border px-ml no-underline"
        >
          Today&rsquo;s puzzle
        </Link>
      </section>
    </MinimalChrome>
  );
}
