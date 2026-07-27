'use client';

import { MinimalChrome } from '@/components/chrome/MinimalChrome';

/**
 * The load-error screen, using copy.md's "Puzzle unavailable" wording.
 *
 * The design pairs that copy with an `ERR · EDITION 1247 · 00:05 UTC`
 * reference line; a root error boundary does not know which edition failed, so
 * the reference is omitted here rather than filled with a guess. A board-level
 * boundary can carry it once the board loads a real edition.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <MinimalChrome>
      <section className="pt-xl drawer:pt-3xl">
        <p className="type-kicker text-fg3-text">Puzzle unavailable</p>
        <p className="type-body text-fg2 mt-s max-w-[52ch]">
          Today&rsquo;s edition did not load. Nothing you did — try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="type-button text-fg border-rule mt-ml inline-flex min-h-(--tap-target-min) items-center border px-ml"
        >
          Try again
        </button>
      </section>
    </MinimalChrome>
  );
}
