import type { SolverState } from '../state.ts';
import type { Step } from '../step.ts';
import { findHiddenSubset } from './subsets.ts';

/** Two digits that between them fit only two cells of a unit. */
export function findHiddenPair(state: SolverState): Step | null {
  return findHiddenSubset(state, 2, 'hiddenPair');
}
