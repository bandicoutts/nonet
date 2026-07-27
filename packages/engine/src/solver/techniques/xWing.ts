import { colOf, rowOf } from '../../grid';
import { DIGITS } from '../../types';
import type { CellIndex } from '../../types';
import { COLS, ROWS } from '../../units';
import type { SolverState } from '../state';
import { reduction } from '../step';
import type { Elimination, Step } from '../step';
import { cellsFor } from './lockedCandidates';

/**
 * X-wing: a digit that fits exactly two cells in each of two rows, and those
 * cells share the same two columns. The digit must take one cell from each row,
 * one per column — so it can be cleared from those columns everywhere else.
 * The same argument runs with rows and columns swapped.
 */
export function findXWing(state: SolverState): Step | null {
  for (const digit of DIGITS) {
    for (const [lines, crossLines, crossOf] of [
      [ROWS, COLS, colOf],
      [COLS, ROWS, rowOf],
    ] as const) {
      const pairs: Array<{ index: number; cells: CellIndex[] }> = [];

      for (let index = 0; index < 9; index += 1) {
        const line = lines[index];
        if (!line) continue;
        const cells = cellsFor(state, line, digit);
        if (cells.length === 2) pairs.push({ index, cells });
      }

      for (let a = 0; a < pairs.length; a += 1) {
        for (let b = a + 1; b < pairs.length; b += 1) {
          const first = pairs[a];
          const second = pairs[b];
          if (!first || !second) continue;

          const firstCross = first.cells.map(crossOf);
          const secondCross = second.cells.map(crossOf);
          if (firstCross[0] !== secondCross[0] || firstCross[1] !== secondCross[1]) continue;

          const corners = new Set([...first.cells, ...second.cells]);
          const eliminations: Elimination[] = [];

          for (const cross of firstCross) {
            const crossLine = crossLines[cross];
            if (!crossLine) continue;
            for (const cell of cellsFor(state, crossLine, digit)) {
              if (!corners.has(cell)) eliminations.push({ cell, digit });
            }
          }

          const step = reduction('xWing', eliminations);
          if (step !== null) return step;
        }
      }
    }
  }
  return null;
}
