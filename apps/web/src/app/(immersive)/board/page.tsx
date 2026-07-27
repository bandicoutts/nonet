import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Board' };

/**
 * The board is immersive: no site nav, and the only way out is the back control
 * labelled for its origin. The Phase 2 components (`BoardLayout`, `Board`,
 * `NumberPad`, `BoardToolbar`, `PauseVeil`) mount here once a puzzle source
 * exists — guest localStorage play, next in Phase 3.
 */
export default function Page() {
  return (
    <section className="flex-1 px-ml pt-ml drawer:px-2xl rail:px-4xl">
      <p className="type-kicker text-fg3-text">Board</p>
      <p className="type-body text-fg2 mt-s max-w-[52ch]">
        The board components are built and tested. They mount here once a puzzle can be loaded
        and autosaved.
      </p>
    </section>
  );
}
