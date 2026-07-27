import { hasCandidate } from '../../candidates';
import { boxOf, colOf, rowOf } from '../../grid';
import { DIGITS } from '../../types';
import type { CellIndex, Digit } from '../../types';
import { BOXES, COLS, ROWS } from '../../units';
import type { SolverState } from '../state';
import { reduction } from '../step';
import type { Elimination, Step } from '../step';

/** Open cells of a unit that still list `digit`. */
export function cellsFor(state: SolverState, unit: readonly CellIndex[], digit: Digit): CellIndex[] {
  const cells: CellIndex[] = [];
  for (const cell of unit) {
    if (state.grid[cell] !== 0) continue;
    if (hasCandidate(state.candidates[cell] ?? 0, digit)) cells.push(cell);
  }
  return cells;
}

function allShare(cells: readonly CellIndex[], of: (cell: CellIndex) => number): number | null {
  const first = cells[0];
  if (first === undefined) return null;
  const value = of(first);
  return cells.every((cell) => of(cell) === value) ? value : null;
}

function eliminateFrom(
  state: SolverState,
  unit: readonly CellIndex[],
  digit: Digit,
  exclude: (cell: CellIndex) => boolean,
): Elimination[] {
  const eliminations: Elimination[] = [];
  for (const cell of cellsFor(state, unit, digit)) {
    if (exclude(cell)) continue;
    eliminations.push({ cell, digit });
  }
  return eliminations;
}

/**
 * Pointing pair/triple: a digit confined to one row or column *within a box*
 * must lie on that line, so it can be cleared from the rest of the line.
 */
export function findPointingPair(state: SolverState): Step | null {
  for (let box = 0; box < 9; box += 1) {
    const boxCells = BOXES[box];
    if (!boxCells) continue;

    for (const digit of DIGITS) {
      const cells = cellsFor(state, boxCells, digit);
      if (cells.length < 2) continue;

      const row = allShare(cells, rowOf);
      if (row !== null) {
        const line = ROWS[row];
        if (line) {
          const step = reduction(
            'pointingPair',
            eliminateFrom(state, line, digit, (cell) => boxOf(cell) === box),
          );
          if (step !== null) return step;
        }
      }

      const col = allShare(cells, colOf);
      if (col !== null) {
        const line = COLS[col];
        if (line) {
          const step = reduction(
            'pointingPair',
            eliminateFrom(state, line, digit, (cell) => boxOf(cell) === box),
          );
          if (step !== null) return step;
        }
      }
    }
  }
  return null;
}

/**
 * Box-line reduction: a digit confined to one box *within a row or column*
 * must lie in that box, so it can be cleared from the rest of the box.
 * The mirror image of a pointing pair.
 */
export function findBoxLine(state: SolverState): Step | null {
  for (const [lines, lineOf] of [
    [ROWS, rowOf],
    [COLS, colOf],
  ] as const) {
    for (let index = 0; index < 9; index += 1) {
      const line = lines[index];
      if (!line) continue;

      for (const digit of DIGITS) {
        const cells = cellsFor(state, line, digit);
        if (cells.length < 2) continue;

        const box = allShare(cells, boxOf);
        if (box === null) continue;

        const boxCells = BOXES[box];
        if (!boxCells) continue;

        const step = reduction(
          'boxLine',
          eliminateFrom(state, boxCells, digit, (cell) => lineOf(cell) === index),
        );
        if (step !== null) return step;
      }
    }
  }
  return null;
}
