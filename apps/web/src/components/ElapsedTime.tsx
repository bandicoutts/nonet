/**
 * The two places the clock is actually read on screen.
 *
 * Both are leaves by construction — they render text and nothing else — because
 * subscribing to the clock means re-rendering every second, and the point of
 * `lib/elapsed.ts` is that only a leaf pays that. Neither takes children, and
 * neither should grow any.
 */
import { formatTime, useElapsed } from '@/lib/elapsed';
import type { ElapsedClock } from '@/lib/elapsed';

/**
 * Just the digits, as a text node — no wrapper element, so it drops into a
 * sentence without changing the markup around it.
 */
export function ElapsedReadout({ clock }: { readonly clock: ElapsedClock }) {
  const elapsedMs = useElapsed(clock);
  return <>{formatTime(elapsedMs)}</>;
}

/**
 * The board's timer.
 *
 * `role="timer"`, not a bare `<p>`: a paragraph is a role that prohibits
 * naming, so the aria-label was being dropped and the readout was announced as
 * raw digits.
 */
export function BoardTimer({ clock }: { readonly clock: ElapsedClock }) {
  const elapsedMs = useElapsed(clock);

  return (
    <p role="timer" className="type-timer m-0 text-fg" aria-label={`Elapsed time ${formatTime(elapsedMs)}`}>
      <span aria-hidden="true">{formatTime(elapsedMs)}</span>
    </p>
  );
}
