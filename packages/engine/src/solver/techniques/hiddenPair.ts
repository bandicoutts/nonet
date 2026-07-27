import type { SolverState } from '../state';
import type { Step } from '../step';
import { findHiddenSubset } from './subsets';

/** Two digits that between them fit only two cells of a unit. */
export function findHiddenPair(state: SolverState): Step | null {
  return findHiddenSubset(state, 2, 'hiddenPair');
}
