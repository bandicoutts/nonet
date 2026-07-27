import { computeCandidates, maskOf } from '../src/candidates';
import { emptyGrid, parseGrid } from '../src/grid';
import { CELL_COUNT } from '../src/types';
import type { CandidateMask, CellIndex, Digit, Grid } from '../src/types';
import type { SolverState } from '../src/solver/state';
import type { Step } from '../src/solver/step';

/**
 * Build a solver state with candidates set only where the fixture says so.
 * Every other cell gets an empty candidate set, which techniques skip — so a
 * fixture can isolate one unit without the rest of the board interfering.
 *
 * The grid stays empty: techniques read candidates, not placed digits.
 */
export function stateWithCandidates(spec: Record<number, readonly Digit[]>): SolverState {
  const candidates = new Array<CandidateMask>(CELL_COUNT).fill(0);
  for (const [cell, digits] of Object.entries(spec)) {
    candidates[Number(cell)] = maskOf(digits);
  }
  return { grid: emptyGrid(), candidates };
}

/** Build a solver state from a real grid, with candidates derived from it. */
export function stateFromGrid(source: string | Grid): SolverState {
  const grid = typeof source === 'string' ? parseGrid(source) : source;
  return { grid, candidates: computeCandidates(grid) };
}

/** Sort eliminations so assertions do not depend on discovery order. */
export function eliminationsOf(step: Step | null): Array<{ cell: CellIndex; digit: Digit }> {
  if (step === null || step.kind !== 'reduction') return [];
  return [...step.eliminations]
    .map(({ cell, digit }) => ({ cell, digit }))
    .sort((a, b) => a.cell - b.cell || a.digit - b.digit);
}
