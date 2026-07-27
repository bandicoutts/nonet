import { getCell } from './grid.js';
import { PEERS } from './units.js';
import { CELL_COUNT } from './types.js';
import type { CellIndex, Digit, Grid } from './types.js';

/** Whether `digit` may legally go in `index` given the digits already placed. */
export function canPlace(grid: Grid, index: CellIndex, digit: Digit): boolean {
  for (const peer of PEERS[index] ?? []) {
    if (grid[peer] === digit) return false;
  }
  return true;
}

/**
 * Peers holding the same digit as `index`, in reading order. Empty for an empty
 * cell. This is what drives the board's error state.
 */
export function conflictsAt(grid: Grid, index: CellIndex): CellIndex[] {
  const value = getCell(grid, index);
  if (value === 0) return [];

  const clashes: CellIndex[] = [];
  for (const peer of PEERS[index] ?? []) {
    if (grid[peer] === value) clashes.push(peer);
  }
  return clashes.sort((a, b) => a - b);
}

/** Every cell involved in a clash, in reading order. */
export function findConflicts(grid: Grid): CellIndex[] {
  const flagged: CellIndex[] = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (conflictsAt(grid, index).length > 0) flagged.push(index);
  }
  return flagged;
}

/** No empty cells. Says nothing about legality. */
export function isComplete(grid: Grid): boolean {
  return grid.every((value) => value !== 0);
}

/** No clashes. Says nothing about completeness. */
export function isLegal(grid: Grid): boolean {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (conflictsAt(grid, index).length > 0) return false;
  }
  return true;
}

export function isSolved(grid: Grid): boolean {
  return isComplete(grid) && isLegal(grid);
}
