import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { BoardScreen } from '@/components/BoardScreen';
import type { PuzzleRef } from '@/lib/storage';

/**
 * The clock must not re-render the board.
 *
 * `elapsedMs` was `useState` on `BoardScreen` and travelled down through
 * `BoardLayout` to `Board`, so every second — at rest, with nobody touching the
 * puzzle — React re-rendered the layout, the grid and all 81 cells, the pad and
 * the toolbar. Nothing on that path is memoised, so each tick rebuilt 81 class
 * strings and allocated 81 conflict arrays to redraw a board that had not
 * changed. On a mid-range phone that is the whole of "the board feels sticky".
 *
 * This is the test that says so. Counted through module mocks rather than by
 * instrumenting the components, so nothing in `src` exists for the test's
 * benefit — and verified to fail against the old code before it was kept: the
 * board, layout, pad and toolbar each gained exactly one render per tick.
 */

const counts = { board: 0, pad: 0, toolbar: 0, layout: 0 };

vi.mock('@/components/Board', () => ({
  Board: () => {
    counts.board += 1;
    return <div data-testid="board" />;
  },
}));

vi.mock('@/components/NumberPad', () => ({
  NumberPad: () => {
    counts.pad += 1;
    return <div data-testid="pad" />;
  },
}));

vi.mock('@/components/BoardToolbar', async () => {
  const actual = await vi.importActual<typeof import('@/components/BoardToolbar')>(
    '@/components/BoardToolbar',
  );
  return {
    ...actual,
    BoardToolbar: (props: Parameters<typeof actual.BoardToolbar>[0]) => {
      counts.toolbar += 1;
      return actual.BoardToolbar(props);
    },
  };
});

vi.mock('@/components/BoardLayout', async () => {
  const actual = await vi.importActual<typeof import('@/components/BoardLayout')>(
    '@/components/BoardLayout',
  );
  return {
    ...actual,
    BoardLayout: (props: Parameters<typeof actual.BoardLayout>[0]) => {
      counts.layout += 1;
      return actual.BoardLayout(props);
    },
  };
});

const REF: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 4242 };

beforeEach(() => {
  window.localStorage.clear();
  counts.board = 0;
  counts.pad = 0;
  counts.toolbar = 0;
  counts.layout = 0;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('the 1s tick', () => {
  it('re-renders nothing but the readout', async () => {
    render(<BoardScreen puzzleRef={REF} />);

    await act(async () => {
      await Promise.resolve();
    });

    const baseline = { ...counts };
    expect(screen.getByRole('timer').textContent).toBe('0:00');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole('timer').textContent).toBe('0:03');
    expect(counts).toEqual(baseline);
  });
});
