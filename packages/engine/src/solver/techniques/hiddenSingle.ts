import { hasCandidate } from '../../candidates';
import { DIGITS } from '../../types';
import type { CellIndex } from '../../types';
import { ALL_UNITS } from '../../units';
import type { SolverState } from '../state';
import { placement } from '../step';
import type { Step } from '../step';

/** A digit that fits exactly one cell of a unit, even if that cell has others. */
export function findHiddenSingle(state: SolverState): Step | null {
  for (const unit of ALL_UNITS) {
    for (const digit of DIGITS) {
      let only: CellIndex | null = null;
      let count = 0;

      for (const cell of unit) {
        if (state.grid[cell] === digit) {
          count = 0;
          break;
        }
        if (state.grid[cell] !== 0) continue;
        if (!hasCandidate(state.candidates[cell] ?? 0, digit)) continue;
        only = cell;
        count += 1;
        if (count > 1) break;
      }

      if (count === 1 && only !== null) return placement('hiddenSingle', only, digit);
    }
  }
  return null;
}
