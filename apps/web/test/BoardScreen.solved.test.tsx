import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { generatePuzzle } from '@nonet/engine';
import { BoardScreen, SOLVED_DWELL_MS } from '@/components/BoardScreen';
import { readSolves } from '@/lib/storage';
import type { PuzzleRef } from '@/lib/storage';

/* Easy, so the fixture solves in one pass and the test stays fast. */
const REF: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 4242 };

const onSolved = vi.fn();

/**
 * Fill every empty cell with its answer, through the real UI path.
 *
 * Clicking a cell and pressing a digit is what a player does; going through the
 * component rather than the reducer is the point, since what is under test is
 * the screen's reaction to the session reaching `solved`.
 */
function solveTheBoard(): void {
  const puzzle = generatePuzzle(REF.difficulty, REF.seed);

  for (let index = 0; index < 81; index += 1) {
    if (puzzle.givens[index] !== 0) continue;

    const row = Math.floor(index / 9) + 1;
    const column = (index % 9) + 1;
    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`row ${row}, column ${column}`, 'i'),
    });

    act(() => {
      cell.focus();
      cell.click();
    });
    act(() => {
      cell.dispatchEvent(
        new KeyboardEvent('keydown', { key: String(puzzle.solution[index]), bubbles: true }),
      );
    });
  }
}

beforeEach(() => {
  window.localStorage.clear();
  onSolved.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('BoardScreen, on solving', () => {
  it('records the solve and then leaves for the result', () => {
    render(<BoardScreen puzzleRef={REF} onSolved={onSolved} />);
    solveTheBoard();

    // Recorded straight away — the result screen reads it from storage, so it
    // has to be there before the navigation happens, not after.
    expect(readSolves()).toHaveLength(1);

    /*
     * The grid is left on screen for a beat. A player's last action was placing
     * a digit, and replacing the board in that same frame means the completed
     * grid is never actually seen.
     */
    expect(onSolved).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(SOLVED_DWELL_MS);
    });
    expect(onSolved).toHaveBeenCalledWith(REF);
  });

  /*
   * Under `prefers-reduced-motion` the dwell is not a shortened animation, it
   * is absent — the same rule the token sheet states for every duration in the
   * product (`copy.md`, Tokens).
   */
  it('leaves immediately under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));

    render(<BoardScreen puzzleRef={REF} onSolved={onSolved} />);
    solveTheBoard();

    expect(onSolved).toHaveBeenCalledWith(REF);
    vi.unstubAllGlobals();
  });

  /* A locked board is not a result. It has its own veil and its own retry. */
  it('does not leave when the board locks instead', () => {
    const puzzle = generatePuzzle(REF.difficulty, REF.seed);
    render(<BoardScreen puzzleRef={REF} onSolved={onSolved} />);

    const empty = puzzle.givens.findIndex((cell) => cell === 0);
    const row = Math.floor(empty / 9) + 1;
    const column = (empty % 9) + 1;
    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`row ${row}, column ${column}`, 'i'),
    });

    // Three wrong digits in the same cell, in cell-first mode, is three
    // mistakes — containment applies to a loaded digit in digit-first only.
    const answer = puzzle.solution[empty]!;
    const wrong = [1, 2, 3, 4].filter((d) => d !== answer).slice(0, 3);

    for (const digit of wrong) {
      act(() => {
        cell.focus();
        cell.click();
      });
      act(() => {
        cell.dispatchEvent(new KeyboardEvent('keydown', { key: String(digit), bubbles: true }));
      });
    }

    act(() => {
      vi.advanceTimersByTime(SOLVED_DWELL_MS * 4);
    });
    expect(onSolved).not.toHaveBeenCalled();
    expect(readSolves()).toHaveLength(0);
  });
});
