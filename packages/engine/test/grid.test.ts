import { describe, expect, test } from 'vitest';
import {
  boxOf,
  cellAt,
  cloneGrid,
  colOf,
  emptyGrid,
  filledCount,
  formatGrid,
  getCell,
  isEmptyAt,
  parseGrid,
  rowOf,
  setCell,
} from '../src/grid.ts';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION, EMPTY_PUZZLE } from './fixtures.ts';

describe('parseGrid', () => {
  test('reads an 81-char string in reading order', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    expect(grid).toHaveLength(81);
    expect(grid[0]).toBe(5);
    expect(grid[1]).toBe(3);
    expect(grid[2]).toBe(0);
    expect(grid[80]).toBe(9);
  });

  test('treats 0 and . as empty', () => {
    const dotted = parseGrid(EMPTY_PUZZLE);
    const zeroed = parseGrid('0'.repeat(81));
    expect(dotted).toEqual(zeroed);
    expect(filledCount(dotted)).toBe(0);
  });

  test('ignores whitespace and newlines so fixtures can be written as a block', () => {
    const block = '53..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79';
    expect(parseGrid(block)).toEqual(parseGrid(CLASSIC_PUZZLE));
  });

  test('rejects a string of the wrong length', () => {
    expect(() => parseGrid('53..7....')).toThrow(/81/);
  });

  test('rejects an unrecognised character', () => {
    expect(() => parseGrid('x'.repeat(81))).toThrow(/character/i);
  });
});

describe('formatGrid', () => {
  test('round-trips through parseGrid', () => {
    expect(formatGrid(parseGrid(CLASSIC_PUZZLE))).toBe(CLASSIC_PUZZLE);
    expect(formatGrid(parseGrid(CLASSIC_SOLUTION))).toBe(CLASSIC_SOLUTION);
  });

  test('writes empty cells as a dot', () => {
    expect(formatGrid(emptyGrid())).toBe('.'.repeat(81));
  });
});

describe('coordinates', () => {
  test('maps index to row, column and box', () => {
    expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
    expect([rowOf(8), colOf(8), boxOf(8)]).toEqual([0, 8, 2]);
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
  });

  test('cellAt is the inverse of rowOf/colOf', () => {
    for (let index = 0; index < 81; index += 1) {
      expect(cellAt(rowOf(index), colOf(index))).toBe(index);
    }
  });
});

describe('reading and writing cells', () => {
  test('setCell returns a new grid and leaves the original untouched', () => {
    const grid = parseGrid(EMPTY_PUZZLE);
    const next = setCell(grid, 0, 7);
    expect(getCell(next, 0)).toBe(7);
    expect(getCell(grid, 0)).toBe(0);
    expect(next).not.toBe(grid);
  });

  test('setCell to 0 clears a cell', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    expect(isEmptyAt(setCell(grid, 0, 0), 0)).toBe(true);
  });

  test('cloneGrid produces an independent copy', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    const copy = cloneGrid(grid);
    expect(copy).toEqual(grid);
    expect(copy).not.toBe(grid);
  });
});

describe('filledCount', () => {
  test('counts the givens', () => {
    expect(filledCount(parseGrid(CLASSIC_PUZZLE))).toBe(30);
    expect(filledCount(parseGrid(CLASSIC_SOLUTION))).toBe(81);
  });
});
