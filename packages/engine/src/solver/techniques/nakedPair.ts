import type { SolverState } from '../state.js';
import type { Step } from '../step.js';
import { findNakedSubset } from './subsets.js';

/** Two cells in a unit sharing the same two candidates. */
export function findNakedPair(state: SolverState): Step | null {
  return findNakedSubset(state, 2, 'nakedPair');
}
