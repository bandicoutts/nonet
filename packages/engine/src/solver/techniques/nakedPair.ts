import type { SolverState } from '../state';
import type { Step } from '../step';
import { findNakedSubset } from './subsets';

/** Two cells in a unit sharing the same two candidates. */
export function findNakedPair(state: SolverState): Step | null {
  return findNakedSubset(state, 2, 'nakedPair');
}
