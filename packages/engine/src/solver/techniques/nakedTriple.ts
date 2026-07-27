import type { SolverState } from '../state.js';
import type { Step } from '../step.js';
import { findNakedSubset } from './subsets.js';

/** Three cells in a unit spanning exactly three candidates between them. */
export function findNakedTriple(state: SolverState): Step | null {
  return findNakedSubset(state, 3, 'nakedTriple');
}
