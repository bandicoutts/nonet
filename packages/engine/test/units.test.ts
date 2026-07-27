import { describe, expect, test } from 'vitest';
import { ALL_UNITS, BOXES, COLS, PEERS, ROWS, UNITS_OF } from '../src/units';
import { boxOf, colOf, rowOf } from '../src/grid';

describe('unit tables', () => {
  test('there are 9 rows, 9 columns and 9 boxes of 9 cells each', () => {
    for (const group of [ROWS, COLS, BOXES]) {
      expect(group).toHaveLength(9);
      for (const unit of group) expect(unit).toHaveLength(9);
    }
  });

  test('ALL_UNITS is the 27 constraint groups', () => {
    expect(ALL_UNITS).toHaveLength(27);
  });

  test('rows, columns and boxes hold the cells their coordinate helpers claim', () => {
    for (let index = 0; index < 81; index += 1) {
      expect(ROWS[rowOf(index)]).toContain(index);
      expect(COLS[colOf(index)]).toContain(index);
      expect(BOXES[boxOf(index)]).toContain(index);
    }
  });

  test('the first box is the top-left 3x3 block', () => {
    expect(BOXES[0]).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20]);
  });

  test('every cell belongs to exactly one row, one column and one box', () => {
    for (let index = 0; index < 81; index += 1) {
      expect(UNITS_OF[index]).toHaveLength(3);
      for (const unit of UNITS_OF[index] ?? []) expect(unit).toContain(index);
    }
  });
});

describe('PEERS', () => {
  test('every cell has 20 peers', () => {
    for (let index = 0; index < 81; index += 1) {
      expect(PEERS[index]).toHaveLength(20);
    }
  });

  test('a cell is never its own peer', () => {
    for (let index = 0; index < 81; index += 1) {
      expect(PEERS[index]).not.toContain(index);
    }
  });

  test('peers of the top-left cell are its row, column and box', () => {
    expect([...(PEERS[0] ?? [])].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72,
    ]);
  });

  test('peerhood is symmetric', () => {
    for (let index = 0; index < 81; index += 1) {
      for (const peer of PEERS[index] ?? []) {
        expect(PEERS[peer]).toContain(index);
      }
    }
  });
});
