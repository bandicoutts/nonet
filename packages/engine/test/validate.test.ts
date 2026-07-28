import { describe, expect, test } from 'vitest';
import { parseGrid, setCell } from '../src/grid.ts';
import {
  canPlace,
  conflictsAt,
  findConflicts,
  hasConflictAt,
  isComplete,
  isLegal,
  isSolved,
} from '../src/validate.ts';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION, EMPTY_PUZZLE } from './fixtures.ts';

describe('canPlace', () => {
  const grid = parseGrid(CLASSIC_PUZZLE);

  test('rejects a digit already in the row', () => {
    // Row 0 holds 5, 3 and 7. Cell 2 is empty.
    expect(canPlace(grid, 2, 5)).toBe(false);
    expect(canPlace(grid, 2, 7)).toBe(false);
  });

  test('rejects a digit already in the column', () => {
    // Column 0 holds 5, 6, 8, 4, 7. Cell 18 is empty.
    expect(canPlace(grid, 18, 6)).toBe(false);
    expect(canPlace(grid, 18, 4)).toBe(false);
  });

  test('rejects a digit already in the box', () => {
    // Box 0 holds 5, 3, 6, 9, 8. Cell 2 is empty.
    expect(canPlace(grid, 2, 9)).toBe(false);
    expect(canPlace(grid, 2, 8)).toBe(false);
  });

  test('accepts a digit no peer uses', () => {
    expect(canPlace(grid, 2, 4)).toBe(true);
  });

  test('accepts any digit on an empty board', () => {
    const blank = parseGrid(EMPTY_PUZZLE);
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
      expect(canPlace(blank, 40, digit)).toBe(true);
    }
  });
});

describe('conflictsAt', () => {
  test('returns nothing for an empty cell', () => {
    expect(conflictsAt(parseGrid(CLASSIC_PUZZLE), 2)).toEqual([]);
  });

  test('returns nothing for a cell that agrees with all its peers', () => {
    expect(conflictsAt(parseGrid(CLASSIC_PUZZLE), 0)).toEqual([]);
  });

  test('names the peers holding the same digit', () => {
    // Two 5s in row 0, on an otherwise empty board so nothing else can clash.
    const grid = setCell(setCell(parseGrid(EMPTY_PUZZLE), 0, 5), 3, 5);
    expect(conflictsAt(grid, 3)).toEqual([0]);
    expect(conflictsAt(grid, 0)).toEqual([3]);
  });

  test('names every clashing peer when a digit clashes on more than one axis', () => {
    // Cell 3 shares row 0 with the 5 at cell 0 and box 1 with the 5 at cell 14.
    const grid = setCell(parseGrid(CLASSIC_PUZZLE), 3, 5);
    expect(conflictsAt(grid, 3)).toEqual([0, 14]);
  });
});

/**
 * The board asks this for all 81 cells on every render, and only ever wanted a
 * boolean — so the contract that matters is that it agrees with `conflictsAt`
 * everywhere, not merely on the cases someone thought to write down.
 */
describe('hasConflictAt', () => {
  test('is false for an empty cell', () => {
    expect(hasConflictAt(parseGrid(CLASSIC_PUZZLE), 2)).toBe(false);
  });

  test('is false for a cell that agrees with all its peers', () => {
    expect(hasConflictAt(parseGrid(CLASSIC_PUZZLE), 0)).toBe(false);
  });

  test('is true on both sides of a clash', () => {
    const grid = setCell(setCell(parseGrid(EMPTY_PUZZLE), 0, 5), 3, 5);
    expect(hasConflictAt(grid, 3)).toBe(true);
    expect(hasConflictAt(grid, 0)).toBe(true);
  });

  test('is true when the clash is on the box axis rather than the row', () => {
    // Cell 3 shares row 0 with the 5 at cell 0 and box 1 with the 5 at cell 14.
    const grid = setCell(parseGrid(CLASSIC_PUZZLE), 3, 5);
    expect(hasConflictAt(grid, 3)).toBe(true);
  });

  test('agrees with conflictsAt on every cell of every grid it is asked about', () => {
    const grids = [
      parseGrid(EMPTY_PUZZLE),
      parseGrid(CLASSIC_PUZZLE),
      parseGrid(CLASSIC_SOLUTION),
      setCell(setCell(parseGrid(EMPTY_PUZZLE), 0, 5), 3, 5),
      setCell(parseGrid(CLASSIC_PUZZLE), 3, 5),
      // A grid with a clash in every unit type at once.
      setCell(setCell(setCell(parseGrid(CLASSIC_PUZZLE), 3, 5), 9, 1), 20, 8),
    ];

    for (const grid of grids) {
      for (let cell = 0; cell < 81; cell += 1) {
        expect(hasConflictAt(grid, cell)).toBe(conflictsAt(grid, cell).length > 0);
      }
    }
  });
});

describe('findConflicts', () => {
  test('is empty for a legal grid', () => {
    expect(findConflicts(parseGrid(CLASSIC_PUZZLE))).toEqual([]);
    expect(findConflicts(parseGrid(CLASSIC_SOLUTION))).toEqual([]);
  });

  test('reports every cell involved in a clash, in reading order', () => {
    const grid = setCell(setCell(parseGrid(EMPTY_PUZZLE), 0, 5), 3, 5);
    expect(findConflicts(grid)).toEqual([0, 3]);
  });
});

describe('isComplete / isLegal / isSolved', () => {
  test('a puzzle with empty cells is legal but not complete', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    expect(isLegal(grid)).toBe(true);
    expect(isComplete(grid)).toBe(false);
    expect(isSolved(grid)).toBe(false);
  });

  test('the solution is complete, legal and solved', () => {
    const grid = parseGrid(CLASSIC_SOLUTION);
    expect(isLegal(grid)).toBe(true);
    expect(isComplete(grid)).toBe(true);
    expect(isSolved(grid)).toBe(true);
  });

  test('a full grid with a clash is complete but not solved', () => {
    // Overwrite cell 1 with the digit already at cell 0.
    const grid = setCell(parseGrid(CLASSIC_SOLUTION), 1, 5);
    expect(isComplete(grid)).toBe(true);
    expect(isLegal(grid)).toBe(false);
    expect(isSolved(grid)).toBe(false);
  });
});
