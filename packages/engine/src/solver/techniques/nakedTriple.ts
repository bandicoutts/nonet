import type { SolverState } from '../state.ts';
import type { Step } from '../step.ts';
import { findNakedSubset } from './subsets.ts';

/** Three cells in a unit spanning exactly three candidates between them. */
export function findNakedTriple(state: SolverState): Step | null {
  return findNakedSubset(state, 3, 'nakedTriple');
}
