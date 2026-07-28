import { getCell } from './grid.ts';
import { PEERS } from './units.ts';
import { CELL_COUNT } from './types.ts';
import type { CellIndex, Digit, Grid } from './types.ts';

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

/**
 * Whether `index` clashes with any peer — the same question as
 * `conflictsAt(...).length > 0`, without building the answer it then throws
 * away.
 *
 * `conflictsAt` allocates an array and sorts it. That is the right shape when a
 * caller wants to *know which* peers clash, and the wrong one for the board,
 * which asks only whether to paint the cell red and asks it for all 81 cells on
 * every render. This returns on the first clash and allocates nothing.
 */
export function hasConflictAt(grid: Grid, index: CellIndex): boolean {
  const value = getCell(grid, index);
  if (value === 0) return false;

  for (const peer of PEERS[index] ?? []) {
    if (grid[peer] === value) return true;
  }
  return false;
}

/** Every cell involved in a clash, in reading order. */
export function findConflicts(grid: Grid): CellIndex[] {
  const flagged: CellIndex[] = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (hasConflictAt(grid, index)) flagged.push(index);
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
    if (hasConflictAt(grid, index)) return false;
  }
  return true;
}

export function isSolved(grid: Grid): boolean {
  return isComplete(grid) && isLegal(grid);
}
