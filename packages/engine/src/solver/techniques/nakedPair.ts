import type { SolverState } from '../state.ts';
import type { Step } from '../step.ts';
import { findNakedSubset } from './subsets.ts';

/** Two cells in a unit sharing the same two candidates. */
export function findNakedPair(state: SolverState): Step | null {
  return findNakedSubset(state, 2, 'nakedPair');
}
