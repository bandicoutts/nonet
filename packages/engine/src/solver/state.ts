import type { CandidateMask, Grid } from '../types.js';
import type { Step } from './step.js';

/** What a technique sees: the placed digits and the current candidate table. */
export interface SolverState {
  readonly grid: Grid;
  readonly candidates: readonly CandidateMask[];
}

export type TechniqueFinder = (state: SolverState) => Step | null;
