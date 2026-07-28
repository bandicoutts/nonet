import { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apply, createSession, getCell, parseGrid } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { Board } from '@/components/Board';

/**
 * How much of the board one action costs.
 *
 * Entering a digit used to re-render all 81 cells: `Cell` took the whole
 * `SessionState` plus two closures the parent allocated per cell per render, so
 * every prop changed identity every time and there was nothing a memo could
 * have compared. Each of those 81 renders then asked `conflictsAt` — an array
 * allocation and a sort — whether its cell clashed.
 *
 * Counted through `digitsOf`, which `Cell` calls exactly once per render and
 * which nothing else in the app calls. Instrumenting from outside means nothing
 * in `src` exists for the test's benefit, and the count is exact rather than
 * inferred.
 */
const renders = { cells: 0 };

vi.mock('@nonet/engine', async () => {
  const actual = await vi.importActual<typeof import('@nonet/engine')>('@nonet/engine');
  return {
    ...actual,
    digitsOf: (mask: number) => {
      renders.cells += 1;
      return actual.digitsOf(mask as never);
    },
  };
});

const PUZZLE =
  '53..7....' + '6..195...' + '.98....6.' + '8...6...3' + '4..8.3..1' +
  '7...2...6' + '.6....28.' + '...419..5' + '....8..79';
const SOLUTION =
  '534678912' + '672195348' + '198342567' + '859761423' + '426853791' +
  '713924856' + '961537284' + '287419635' + '345286179';

function Host({ initial }: { readonly initial?: Partial<Parameters<typeof createSession>[0]> }) {
  const [session, setSession] = useState<SessionState>(() =>
    createSession({ givens: parseGrid(PUZZLE), solution: parseGrid(SOLUTION), ...initial }),
  );
  const onAction = useCallback((action: Action) => setSession((s) => apply(s, action)), []);
  return <Board session={session} onAction={onAction} />;
}

beforeEach(() => {
  renders.cells = 0;
});

afterEach(cleanup);

const cell = (index: number) => screen.getByRole('gridcell', { name: rowCol(index) });
const rowCol = (index: number) =>
  new RegExp(`^Row ${Math.floor(index / 9) + 1}, column ${(index % 9) + 1},`);

describe('the cost of one digit entry', () => {
  test('re-renders only the cells whose appearance changes', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const grid = parseGrid(PUZZLE);

    // Cell 2 is empty and takes a 4. Four already appears five times on this
    // board, and each of those gains the matching-digit shading.
    const target = 2;
    const digit = 4;
    const existing = grid.filter((v) => v === digit).length;
    expect(getCell(grid, target)).toBe(0);

    await user.click(cell(target));
    renders.cells = 0;

    await user.keyboard(String(digit));

    // The cell that changed, plus every cell that lights up as a match.
    expect(renders.cells).toBe(1 + existing);
    expect(renders.cells).toBeLessThan(81);
  });

  test('moving the selection re-renders the two units, not the board', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(cell(0));
    renders.cells = 0;

    await user.keyboard('{ArrowRight}');

    /*
     * Eighteen, and it is worth writing out, because the obvious account of it
     * is wrong. Cell 0 to cell 1 keeps row 0 *and* box 0, so the top three
     * cells of each column stay lit either way: only **six** leave column 0
     * (27, 36, 45, 54, 63, 72) and six join column 1 (28, 37, 46, 55, 64, 73).
     * With the two cells that swap the selection, that is fourteen.
     *
     * The other four are the matching-digit layer, which is easy to forget
     * because it has nothing to do with geometry. Cell 0 holds a given 5 and
     * cell 1 a given 3, so the board stops shading the other 5s (14, 71) and
     * starts shading the other 3s (35, 41).
     *
     * Fourteen plus four, on a board where the two cells happen to hold
     * digits. An arrow press still produces **two** commits — the key, then the
     * focus that follows the selection — and the second re-renders no cells at
     * all, because every prop it hands them compares equal. That second commit
     * is why the old count was 162 rather than 81.
     */
    expect(renders.cells).toBe(18);
  });

  test('a note re-renders one cell', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(cell(2));
    renders.cells = 0;

    await user.keyboard('{Shift>}5{/Shift}');

    expect(renders.cells).toBe(1);
  });
});
