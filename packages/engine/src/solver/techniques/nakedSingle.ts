import { singleCandidate } from '../../candidates.ts';
import { CELL_COUNT } from '../../types.ts';
import type { SolverState } from '../state.ts';
import { placement } from '../step.ts';
import type { Step } from '../step.ts';

/** A cell with exactly one candidate left. */
export function findNakedSingle(state: SolverState): Step | null {
  for (let cell = 0; cell < CELL_COUNT; cell += 1) {
    if (state.grid[cell] !== 0) continue;
    const digit = singleCandidate(state.candidates[cell] ?? 0);
    if (digit !== null) return placement('nakedSingle', cell, digit);
  }
  return null;
}
