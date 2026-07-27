import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Solved' };

/** The result screen: time, mistakes, percentile where one was earned, and share. */
export default function Page() {
  return (
    <section className="flex-1 px-ml pt-ml drawer:px-2xl rail:px-4xl">
      <p className="type-kicker text-fg3-text">Solved</p>
      <p className="type-body text-fg2 mt-s max-w-[52ch]">
        The result, the stat grid and the spoiler-free share text land with the solve flow.
      </p>
    </section>
  );
}
