import { boxOf, cellAt, colOf, rowOf } from './grid.ts';
import { CELL_COUNT, UNIT_SIZE } from './types.ts';
import type { CellIndex } from './types.ts';

/** A constraint group: nine cells that must hold each digit exactly once. */
export type Unit = readonly CellIndex[];

function buildRows(): Unit[] {
  return Array.from({ length: UNIT_SIZE }, (_, row) =>
    Array.from({ length: UNIT_SIZE }, (_, col) => cellAt(row, col)),
  );
}

function buildCols(): Unit[] {
  return Array.from({ length: UNIT_SIZE }, (_, col) =>
    Array.from({ length: UNIT_SIZE }, (_, row) => cellAt(row, col)),
  );
}

function buildBoxes(): Unit[] {
  return Array.from({ length: UNIT_SIZE }, (_, box) => {
    const cells: CellIndex[] = [];
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (boxOf(index) === box) cells.push(index);
    }
    return cells;
  });
}

export const ROWS: readonly Unit[] = buildRows();
export const COLS: readonly Unit[] = buildCols();
export const BOXES: readonly Unit[] = buildBoxes();

/** All 27 constraint groups: rows, then columns, then boxes. */
export const ALL_UNITS: readonly Unit[] = [...ROWS, ...COLS, ...BOXES];

/** The three units (row, column, box) containing each cell. */
export const UNITS_OF: readonly (readonly Unit[])[] = Array.from(
  { length: CELL_COUNT },
  (_, index) => {
    const row = ROWS[rowOf(index)];
    const col = COLS[colOf(index)];
    const box = BOXES[boxOf(index)];
    if (!row || !col || !box) throw new Error(`Cell index ${index} is out of range`);
    return [row, col, box];
  },
);

/** The 20 cells that share a unit with each cell, excluding the cell itself. */
export const PEERS: readonly (readonly CellIndex[])[] = Array.from(
  { length: CELL_COUNT },
  (_, index) => {
    const peers = new Set<CellIndex>();
    for (const unit of UNITS_OF[index] ?? []) {
      for (const cell of unit) if (cell !== index) peers.add(cell);
    }
    return [...peers];
  },
);
