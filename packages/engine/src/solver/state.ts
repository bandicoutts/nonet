import type { CandidateMask, Grid } from '../types.ts';
import type { Step } from './step.ts';

/** What a technique sees: the placed digits and the current candidate table. */
export interface SolverState {
  readonly grid: Grid;
  readonly candidates: readonly CandidateMask[];
}

export type TechniqueFinder = (state: SolverState) => Step | null;
