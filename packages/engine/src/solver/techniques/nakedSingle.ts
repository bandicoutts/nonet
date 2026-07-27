import { singleCandidate } from '../../candidates';
import { CELL_COUNT } from '../../types';
import type { SolverState } from '../state';
import { placement } from '../step';
import type { Step } from '../step';

/** A cell with exactly one candidate left. */
export function findNakedSingle(state: SolverState): Step | null {
  for (let cell = 0; cell < CELL_COUNT; cell += 1) {
    if (state.grid[cell] !== 0) continue;
    const digit = singleCandidate(state.candidates[cell] ?? 0);
    if (digit !== null) return placement('nakedSingle', cell, digit);
  }
  return null;
}
