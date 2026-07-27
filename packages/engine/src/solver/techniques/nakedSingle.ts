import { singleCandidate } from '../../candidates.js';
import { CELL_COUNT } from '../../types.js';
import type { SolverState } from '../state.js';
import { placement } from '../step.js';
import type { Step } from '../step.js';

/** A cell with exactly one candidate left. */
export function findNakedSingle(state: SolverState): Step | null {
  for (let cell = 0; cell < CELL_COUNT; cell += 1) {
    if (state.grid[cell] !== 0) continue;
    const digit = singleCandidate(state.candidates[cell] ?? 0);
    if (digit !== null) return placement('nakedSingle', cell, digit);
  }
  return null;
}
