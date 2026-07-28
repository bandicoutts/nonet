/**
 * The board's clock, held outside React.
 *
 * The elapsed time was a `useState` on `BoardScreen`, which meant the 1s tick
 * re-rendered the whole board: `BoardScreen` → `BoardLayout` → `Board` → all 81
 * cells, plus the pad and the toolbar. Nothing is memoised, so every second, at
 * rest, with no input, the app rebuilt 81 class strings and allocated 81
 * conflict arrays to redraw a board that had not changed.
 *
 * So the value lives here instead, in a store the board can read without
 * subscribing to. Everything that only needs the *current* number — the
 * autosave, the recorded solve — calls `get()`. The one place that needs to
 * re-render when it changes subscribes through `useElapsed`, and that component
 * is a leaf with nothing under it.
 *
 * `formatTime` lives here rather than in `BoardToolbar` so the readouts can
 * import it without a cycle. It is re-exported from `BoardToolbar` for the
 * callers that already had it.
 */
import { useSyncExternalStore } from 'react';

/** Display caps at 99:59+, so a long session never breaks the layout. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes > 99) return '99:59+';
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export interface ElapsedClock {
  /** The current time, without subscribing to it. */
  readonly get: () => number;
  /** Set it outright — restoring a saved board. */
  readonly set: (ms: number) => void;
  /** Move it on — the tick. */
  readonly advance: (ms: number) => void;
  readonly subscribe: (listener: () => void) => () => void;
}

export function createElapsedClock(initial = 0): ElapsedClock {
  let ms = initial;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: () => ms,
    set: (next) => {
      if (next === ms) return;
      ms = next;
      notify();
    },
    advance: (delta) => {
      if (delta === 0) return;
      ms += delta;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Subscribe to the clock. **Only ever call this from a leaf.**
 *
 * A component that calls this re-renders every second, which is the cost the
 * store exists to contain — so whatever calls it must have nothing of
 * consequence beneath it.
 *
 * `get` serves as the server snapshot too: a fresh clock reads 0 there, which
 * is what the old `useState(0)` rendered, so the first HTML is unchanged.
 */
export function useElapsed(clock: ElapsedClock): number {
  return useSyncExternalStore(clock.subscribe, clock.get, clock.get);
}
