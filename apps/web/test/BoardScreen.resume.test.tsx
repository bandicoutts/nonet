import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generatePuzzle } from '@nonet/engine';
import { BoardScreen } from '@/components/BoardScreen';
import { readAutosave, readSolves } from '@/lib/storage';
import type { PuzzleRef } from '@/lib/storage';

const REF: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 4242 };

/** Seven minutes eleven, which is what a resumed board must still be showing. */
const CARRIED_MS = 431_000;

/**
 * A board one cell from complete, with time already on the clock.
 *
 * Written straight to storage rather than played, because what is under test is
 * the resume path — and the interesting case is a puzzle with real elapsed time
 * behind it, which is every puzzle anyone actually comes back to.
 */
function seedNearlyDone(): { index: number; digit: number } {
  const puzzle = generatePuzzle(REF.difficulty, REF.seed);
  const last = puzzle.givens.lastIndexOf(0);

  const grid = [...puzzle.solution].map((d, i) => (i === last ? '0' : String(d))).join('');

  window.localStorage.setItem(
    `nonet:autosave:${REF.kind}:${REF.difficulty}:${REF.seed}`,
    JSON.stringify({
      version: 1,
      ref: REF,
      grid,
      notes: new Array(81).fill(0),
      elapsedMs: CARRIED_MS,
      mistakes: 1,
      hintsUsed: 0,
      updatedAt: new Date().toISOString(),
    }),
  );

  return { index: last, digit: puzzle.solution[last]! };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('BoardScreen, on resuming', () => {
  /*
   * Found in a browser: the timer came back as 0:05 on a board saved at 7:11.
   *
   * `setElapsed` was being called inside the `setSession` updater. An updater
   * must be pure, React discards the nested update, and the autosave effect
   * then wrote the restored board back out with `elapsedMs: 0` — so the saved
   * time was not merely mis-displayed, it was destroyed on the next write.
   */
  it('carries the elapsed time back onto the board', () => {
    seedNearlyDone();
    render(
      <StrictMode>
        <BoardScreen puzzleRef={REF} />
      </StrictMode>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const saved = readAutosave(REF);
    expect(saved?.elapsedMs).toBeGreaterThanOrEqual(CARRIED_MS);
  });

  /*
   * And the consequence that matters: the recorded solve, which is what the
   * result screen states, what the streak counts and what the percentile ranks
   * a player by. A lost timer is a false personal best.
   */
  it('records the carried time when a resumed board is finished', () => {
    const { index, digit } = seedNearlyDone();
    render(
      <StrictMode>
        <BoardScreen puzzleRef={REF} />
      </StrictMode>,
    );

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
      cell.dispatchEvent(new KeyboardEvent('keydown', { key: String(digit), bubbles: true }));
    });

    const [solve] = readSolves();
    expect(solve?.durationMs).toBeGreaterThanOrEqual(CARRIED_MS);
    expect(solve?.mistakes).toBe(1);
  });
});

/*
 * The two inline notices (NONET-34). Both are `copy.md` states that were never
 * built, and both carry the Dismiss control that `layout.md` measured at ~22px
 * — the single WCAG AA target-size breach in the design.
 */
describe('BoardScreen, the inline notices', () => {
  it('offers the rules to a player with no history', () => {
    render(<BoardScreen puzzleRef={REF} />);
    expect(screen.getByText(/First time here/)).toBeDefined();
  });

  it('does not offer them to a player who has played', () => {
    window.localStorage.setItem(
      'nonet:solves',
      JSON.stringify([{ ref: REF, kind: 'daily', localDate: '2026-07-01' }]),
    );
    render(<BoardScreen puzzleRef={REF} />);

    expect(screen.queryByText(/First time here/)).toBeNull();
  });

  /* Dismissing is remembered, or the offer stops reading as an offer. */
  it('remembers the offer being dismissed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const view = render(<BoardScreen puzzleRef={REF} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/First time here/)).toBeNull();

    view.unmount();
    render(<BoardScreen puzzleRef={REF} />);
    expect(screen.queryByText(/First time here/)).toBeNull();
  });

  /*
   * The dismiss is built at the product's 44px standard rather than the ~22px
   * the design draws, which is the one thing in the export that fails AA.
   */
  it('gives the dismiss a real target', () => {
    render(<BoardScreen puzzleRef={REF} />);
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });

    expect(dismiss.className).toContain('min-h-(--tap-target-min)');
  });

  /*
   * A board that arrived from another device says so — otherwise a player
   * opening a part-filled puzzle cannot tell their own work from a bug.
   */
  it('says when the board came from another device', () => {
    seedNearlyDone();
    window.localStorage.setItem(`nonet:resumed:${REF.kind}:${REF.difficulty}:${REF.seed}`, 'true');

    render(<BoardScreen puzzleRef={REF} />);
    expect(screen.getByText(/Resumed from your other device/)).toBeDefined();
    expect(screen.getByText(/80 of 81 placed/)).toBeDefined();
  });

  /* The marker is consumed, so the notice appears once and not every visit. */
  it('says it only once', () => {
    seedNearlyDone();
    window.localStorage.setItem(`nonet:resumed:${REF.kind}:${REF.difficulty}:${REF.seed}`, 'true');

    const view = render(<BoardScreen puzzleRef={REF} />);
    expect(screen.getByText(/Resumed from your other device/)).toBeDefined();

    view.unmount();
    render(<BoardScreen puzzleRef={REF} />);
    expect(screen.queryByText(/Resumed from your other device/)).toBeNull();
  });
});
