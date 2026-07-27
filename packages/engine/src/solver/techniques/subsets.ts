import { countCandidates, digitsOf, hasCandidate } from '../../candidates';
import type { CandidateMask, CellIndex } from '../../types';
import { ALL_UNITS } from '../../units';
import type { Unit } from '../../units';
import type { SolverState } from '../state';
import { reduction } from '../step';
import type { Elimination, Step, Technique } from '../step';

/** Cells of a unit that are still open, with their candidate masks. */
function openCells(state: SolverState, unit: Unit): Array<{ cell: CellIndex; mask: CandidateMask }> {
  const open: Array<{ cell: CellIndex; mask: CandidateMask }> = [];
  for (const cell of unit) {
    if (state.grid[cell] !== 0) continue;
    const mask = state.candidates[cell] ?? 0;
    if (mask !== 0) open.push({ cell, mask });
  }
  return open;
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  const result: T[][] = [];
  for (let i = 0; i <= items.length - size; i += 1) {
    const head = items[i];
    if (head === undefined) continue;
    for (const tail of combinations(items.slice(i + 1), size - 1)) {
      result.push([head, ...tail]);
    }
  }
  return result;
}

/**
 * A naked subset: `size` cells whose candidates between them span exactly
 * `size` digits. Those digits belong to those cells, so no other cell in the
 * unit can use them.
 */
export function findNakedSubset(state: SolverState, size: number, technique: Technique): Step | null {
  for (const unit of ALL_UNITS) {
    const open = openCells(state, unit);
    if (open.length <= size) continue;

    for (const group of combinations(open, size)) {
      let union = 0;
      for (const { mask } of group) union |= mask;
      if (countCandidates(union) !== size) continue;

      const members = new Set(group.map(({ cell }) => cell));
      const eliminations: Elimination[] = [];

      for (const { cell, mask } of open) {
        if (members.has(cell)) continue;
        for (const digit of digitsOf(mask & union)) {
          eliminations.push({ cell, digit });
        }
      }

      const step = reduction(technique, eliminations);
      if (step !== null) return step;
    }
  }
  return null;
}

/**
 * A hidden subset: `size` digits that between them fit only `size` cells of a
 * unit. Those cells can hold nothing else.
 */
export function findHiddenSubset(state: SolverState, size: number, technique: Technique): Step | null {
  for (const unit of ALL_UNITS) {
    const open = openCells(state, unit);
    if (open.length <= size) continue;

    const placedDigits = new Set(unit.map((cell) => state.grid[cell]).filter((value) => value !== 0));
    const available = digitsOf(
      open.reduce((mask, { mask: cellMask }) => mask | cellMask, 0),
    ).filter((digit) => !placedDigits.has(digit));

    for (const group of combinations(available, size)) {
      const holders = open.filter(({ mask }) => group.some((digit) => hasCandidate(mask, digit)));
      if (holders.length !== size) continue;

      let groupMask = 0;
      for (const digit of group) groupMask |= 1 << (digit - 1);

      const eliminations: Elimination[] = [];
      for (const { cell, mask } of holders) {
        for (const digit of digitsOf(mask & ~groupMask)) {
          eliminations.push({ cell, digit });
        }
      }

      const step = reduction(technique, eliminations);
      if (step !== null) return step;
    }
  }
  return null;
}
