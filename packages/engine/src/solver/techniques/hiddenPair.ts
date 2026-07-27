import type { SolverState } from '../state.js';
import type { Step } from '../step.js';
import { findHiddenSubset } from './subsets.js';

/** Two digits that between them fit only two cells of a unit. */
export function findHiddenPair(state: SolverState): Step | null {
  return findHiddenSubset(state, 2, 'hiddenPair');
}
