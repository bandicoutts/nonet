import { getCell } from '../grid.ts';
import { easiestCell } from '../solver/index.ts';
import type { CellIndex, Digit, Grid } from '../types.ts';

/** Three reveals per puzzle. */
export const MAX_HINTS = 3;

export interface Hint {
  readonly cell: CellIndex;
  readonly digit: Digit;
}

/**
 * The first hint in a puzzle confirms once: it is irreversible and forfeits the
 * percentile, so the cost is stated before it is paid. Hints two and three go
 * straight through, because that cost has already been accepted.
 */
export function hintNeedsConfirmation(state: { hintsUsed: number }): boolean {
  return state.hintsUsed === 0;
}

/**
 * Where a hint lands: the selected cell if one is selected and still empty,
 * otherwise the easiest unfilled cell — the one the solver can resolve with the
 * cheapest technique.
 */
export function chooseHint(grid: Grid, solution: Grid, selected: CellIndex | null): Hint | null {
  if (selected !== null && getCell(grid, selected) === 0) {
    const digit = solution[selected];
    if (digit !== undefined && digit !== 0) return { cell: selected, digit };
  }

  const easiest = easiestCell(grid);
  if (easiest === null) return null;

  // Trust the puzzle's own solution over the solver's, in case the player has
  // entered a wrong digit that sends deduction somewhere else.
  const digit = solution[easiest.cell];
  if (digit === undefined || digit === 0) return null;

  return { cell: easiest.cell, digit };
}
