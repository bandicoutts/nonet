import { BOX_SIZE, CELL_COUNT, UNIT_SIZE } from './types.js';
import type { CellIndex, CellValue, Digit, Grid, MutableGrid } from './types.js';

const EMPTY_CHARS = new Set(['.', '0']);

export function emptyGrid(): Grid {
  return new Array<CellValue>(CELL_COUNT).fill(0);
}

export function cloneGrid(grid: Grid): MutableGrid {
  return grid.slice() as MutableGrid;
}

/**
 * Parse an 81-cell grid. Empty cells are `.` or `0`; whitespace is ignored so
 * fixtures can be written as a nine-line block.
 */
export function parseGrid(source: string): Grid {
  const chars = [...source].filter((char) => !/\s/.test(char));

  if (chars.length !== CELL_COUNT) {
    throw new Error(`A grid needs exactly 81 cells, received ${chars.length}`);
  }

  return chars.map((char, index) => {
    if (EMPTY_CHARS.has(char)) return 0;
    if (char >= '1' && char <= '9') return Number(char) as Digit;
    throw new Error(`Unrecognised character "${char}" at position ${index}`);
  });
}

export function formatGrid(grid: Grid): string {
  return grid.map((value) => (value === 0 ? '.' : String(value))).join('');
}

export function rowOf(index: CellIndex): number {
  return Math.floor(index / UNIT_SIZE);
}

export function colOf(index: CellIndex): number {
  return index % UNIT_SIZE;
}

export function boxOf(index: CellIndex): number {
  return Math.floor(rowOf(index) / BOX_SIZE) * BOX_SIZE + Math.floor(colOf(index) / BOX_SIZE);
}

export function cellAt(row: number, col: number): CellIndex {
  return row * UNIT_SIZE + col;
}

export function getCell(grid: Grid, index: CellIndex): CellValue {
  const value = grid[index];
  if (value === undefined) throw new Error(`Cell index ${index} is out of range`);
  return value;
}

export function isEmptyAt(grid: Grid, index: CellIndex): boolean {
  return getCell(grid, index) === 0;
}

/** Returns a new grid with `index` set to `value`; the input is not mutated. */
export function setCell(grid: Grid, index: CellIndex, value: CellValue): Grid {
  if (index < 0 || index >= CELL_COUNT) throw new Error(`Cell index ${index} is out of range`);
  const next = cloneGrid(grid);
  next[index] = value;
  return next;
}

export function filledCount(grid: Grid): number {
  let count = 0;
  for (const value of grid) if (value !== 0) count += 1;
  return count;
}

export function emptyCells(grid: Grid): CellIndex[] {
  const cells: CellIndex[] = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (grid[index] === 0) cells.push(index);
  }
  return cells;
}
