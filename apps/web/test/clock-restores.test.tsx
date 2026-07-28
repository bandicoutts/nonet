import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { generatePuzzle } from '@nonet/engine';
import { BoardScreen } from '@/components/BoardScreen';
import { PuzzleBoard } from '@/components/PuzzleBoard';
import type { PuzzleRef } from '@/lib/storage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

const REF: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 4242 };
const OTHER: PuzzleRef = { kind: 'practice', difficulty: 'hard', seed: 777 };

/** Seven minutes eleven, which is what a resumed board must still be showing. */
const CARRIED_MS = 431_000;

function seed(ref: PuzzleRef, elapsedMs: number): void {
  const puzzle = generatePuzzle(ref.difficulty, ref.seed);
  window.localStorage.setItem(
    `nonet:autosave:${ref.kind}:${ref.difficulty}:${ref.seed}`,
    JSON.stringify({
      version: 1,
      ref,
      grid: puzzle.givens.join(''),
      notes: new Array(81).fill(0),
      elapsedMs,
      mistakes: 0,
      hintsUsed: 0,
      updatedAt: new Date().toISOString(),
    }),
  );
}

/**
 * Every autosave write, in order.
 *
 * The existing resume test reads storage at the end, which a bug that writes a
 * zero and corrects it a second later would survive — and that bug destroys a
 * player's clock the moment they close the tab in between. So this watches the
 * writes themselves, and the assertion is on the first one.
 */
function recordWrites(): { elapsed: number[] } {
  const record = { elapsed: [] as number[] };
  // On the prototype: jsdom resolves `setItem` there, so an own-property spy on
  // the instance is simply never consulted and records nothing.
  const real = Storage.prototype.setItem;

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (key.startsWith('nonet:autosave')) {
      try {
        record.elapsed.push(JSON.parse(value).elapsedMs);
      } catch {
        // Not ours to interpret.
      }
    }
    real.call(this, key, value);
  });

  return record;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  cleanup();
});

describe('the clock on the resume path', () => {
  /**
   * The guarantee, stated as the thing that can actually break.
   *
   * Not "the clock is set before `setSession`" — that ordering is not
   * load-bearing, and a test asserting it would pass either way. What matters
   * is that the restored time is in the store before anything reads it, which
   * fails loudly the moment the clock is set from somewhere React can discard.
   */
  it('carries the restored time into the very first autosave write', () => {
    seed(REF, CARRIED_MS);
    const writes = recordWrites();

    render(
      <StrictMode>
        <BoardScreen puzzleRef={REF} />
      </StrictMode>,
    );

    act(() => void vi.advanceTimersByTime(1000));

    expect(writes.elapsed.length).toBeGreaterThan(0);
    // The first write, not the last: a zero here is a destroyed clock even if
    // a later write puts the number back.
    expect(writes.elapsed[0]).toBeGreaterThanOrEqual(CARRIED_MS);
    expect(writes.elapsed).not.toContain(0);
  });

  it('shows the restored time rather than counting up from zero', () => {
    seed(REF, CARRIED_MS);

    render(<BoardScreen puzzleRef={REF} />);
    act(() => void vi.advanceTimersByTime(1000));

    expect(screen.getByRole('timer').textContent).toBe('7:12');
  });
});

/**
 * A board is a sitting at one puzzle, not a view of a ref.
 *
 * An App Router navigation from one puzzle straight to another is the same
 * element in the same position with new props, so React reconciles rather than
 * remounts — and everything the board establishes on mount survives: the
 * generated grid, the session, the clock, and the guards that remember whether
 * this board has been restored and recorded. Measured before the key existed:
 * the previous puzzle's givens stayed on screen and its time stayed on the
 * clock.
 */
describe('switching puzzles without a page load', () => {
  it('starts the new puzzle on a fresh clock', () => {
    const view = render(<PuzzleBoard puzzleRef={REF} />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByRole('timer').textContent).toBe('0:05');

    view.rerender(<PuzzleBoard puzzleRef={OTHER} />);

    expect(screen.getByRole('timer').textContent).toBe('0:00');
  });

  it('deals the new puzzle rather than keeping the old grid', () => {
    const givens = () =>
      screen
        .getAllByRole('gridcell')
        .map((c) => (c.hasAttribute('data-given') ? c.textContent : '.'))
        .join('');

    const view = render(<PuzzleBoard puzzleRef={REF} />);
    const before = givens();

    view.rerender(<PuzzleBoard puzzleRef={OTHER} />);

    expect(givens()).not.toBe(before);
  });

  it('resumes the new puzzle’s own saved time, not the old board’s', () => {
    seed(OTHER, CARRIED_MS);

    const view = render(<PuzzleBoard puzzleRef={REF} />);
    act(() => void vi.advanceTimersByTime(3000));

    view.rerender(<PuzzleBoard puzzleRef={OTHER} />);
    act(() => void vi.advanceTimersByTime(0));

    expect(screen.getByRole('timer').textContent).toBe('7:11');
  });
});

/**
 * Leaving the board stops the clock.
 *
 * Two intervals run while a board is playing — the tick and the ten-second
 * autosave — and both are owned by effects, so unmounting has to leave nothing
 * behind. A surviving interval would go on writing a dead board's autosave.
 */
describe('navigating away from the board', () => {
  it('leaves no timers running', () => {
    const view = render(<PuzzleBoard puzzleRef={REF} />);
    act(() => void vi.advanceTimersByTime(3000));

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
