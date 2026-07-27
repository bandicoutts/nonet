import type { SolverState } from '../state';
import type { Step } from '../step';
import { findNakedSubset } from './subsets';

/** Three cells in a unit spanning exactly three candidates between them. */
export function findNakedTriple(state: SolverState): Step | null {
  return findNakedSubset(state, 3, 'nakedTriple');
}
