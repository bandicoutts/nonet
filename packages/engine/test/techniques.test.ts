import { describe, expect, test } from 'vitest';
import { digitsOf } from '../src/candidates.js';
import { findBoxLine } from '../src/solver/techniques/boxLine.js';
import { findChain } from '../src/solver/techniques/chain.js';
import { findHiddenPair } from '../src/solver/techniques/hiddenPair.js';
import { findHiddenSingle } from '../src/solver/techniques/hiddenSingle.js';
import { findNakedPair } from '../src/solver/techniques/nakedPair.js';
import { findNakedSingle } from '../src/solver/techniques/nakedSingle.js';
import { findNakedTriple } from '../src/solver/techniques/nakedTriple.js';
import { findPointingPair } from '../src/solver/techniques/pointingPair.js';
import { findXWing } from '../src/solver/techniques/xWing.js';
import { eliminationsOf, stateFromGrid, stateWithCandidates } from './helpers.js';
import { HIDDEN_SINGLE_GRID, NAKED_SINGLE_GRID } from './fixtures.js';

describe('naked single', () => {
  test('places the only digit a cell can take', () => {
    const step = findNakedSingle(stateFromGrid(NAKED_SINGLE_GRID));
    expect(step).toMatchObject({ kind: 'placement', technique: 'nakedSingle', cell: 8, digit: 9 });
  });

  test('finds nothing when every cell has a choice', () => {
    expect(findNakedSingle(stateFromGrid(HIDDEN_SINGLE_GRID))).toBeNull();
  });
});

describe('hidden single', () => {
  test('places a digit that fits only one cell of a unit', () => {
    const step = findHiddenSingle(stateFromGrid(HIDDEN_SINGLE_GRID));
    expect(step).toMatchObject({ kind: 'placement', technique: 'hiddenSingle', cell: 0, digit: 5 });
  });

  test('finds nothing on a board where no digit is cornered', () => {
    // A 2x2 block of {1,2} cells: both digits have two homes in every row,
    // column and box they touch, so nothing is forced.
    const state = stateWithCandidates({ 0: [1, 2], 1: [1, 2], 9: [1, 2], 10: [1, 2] });
    expect(findHiddenSingle(state)).toBeNull();
  });
});

describe('naked pair', () => {
  test('strips the pair digits from the rest of the unit', () => {
    const state = stateWithCandidates({
      0: [1, 2],
      1: [1, 2],
      2: [1, 2, 3],
      3: [2, 4],
    });
    const step = findNakedPair(state);
    expect(step?.technique).toBe('nakedPair');
    expect(eliminationsOf(step)).toEqual([
      { cell: 2, digit: 1 },
      { cell: 2, digit: 2 },
      { cell: 3, digit: 2 },
    ]);
  });

  test('finds nothing when the pair would eliminate nothing', () => {
    expect(findNakedPair(stateWithCandidates({ 0: [1, 2], 1: [1, 2], 2: [3, 4] }))).toBeNull();
  });
});

describe('hidden pair', () => {
  test('reduces the two cells to the two digits only they can hold', () => {
    const state = stateWithCandidates({
      0: [1, 2, 4, 5],
      1: [3, 4, 5],
      2: [1, 2, 3],
      3: [1, 3],
    });
    const step = findHiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(eliminationsOf(step)).toEqual([
      { cell: 0, digit: 1 },
      { cell: 0, digit: 2 },
      { cell: 1, digit: 3 },
    ]);
  });
});

describe('naked triple', () => {
  test('strips the three digits from the rest of the unit', () => {
    const state = stateWithCandidates({
      0: [1, 2],
      1: [2, 3],
      2: [1, 3],
      3: [1, 4],
      4: [3, 5],
    });
    const step = findNakedTriple(state);
    expect(step?.technique).toBe('nakedTriple');
    expect(eliminationsOf(step)).toEqual([
      { cell: 3, digit: 1 },
      { cell: 4, digit: 3 },
    ]);
  });
});

describe('pointing pair', () => {
  test('a digit confined to one row of a box leaves the rest of that row', () => {
    const state = stateWithCandidates({
      0: [7, 1],
      1: [7, 2],
      4: [7, 3],
      6: [7, 5],
    });
    const step = findPointingPair(state);
    expect(step?.technique).toBe('pointingPair');
    expect(eliminationsOf(step)).toEqual([
      { cell: 4, digit: 7 },
      { cell: 6, digit: 7 },
    ]);
  });
});

describe('box-line reduction', () => {
  test('a digit confined to one box of a row leaves the rest of that box', () => {
    const state = stateWithCandidates({
      0: [7, 1],
      1: [7, 2],
      2: [7, 3],
      9: [7, 4],
      19: [7, 5],
    });
    const step = findBoxLine(state);
    expect(step?.technique).toBe('boxLine');
    expect(eliminationsOf(step)).toEqual([
      { cell: 9, digit: 7 },
      { cell: 19, digit: 7 },
    ]);
  });
});

describe('X-wing', () => {
  test('two rows sharing the same two columns clear those columns', () => {
    const state = stateWithCandidates({
      1: [3, 7],
      5: [3, 7],
      37: [3, 7],
      41: [3, 7],
      19: [3, 8],
      20: [3, 8],
      23: [3, 9],
    });
    const step = findXWing(state);
    expect(step?.technique).toBe('xWing');
    expect(eliminationsOf(step)).toEqual([
      { cell: 19, digit: 3 },
      { cell: 23, digit: 3 },
    ]);
  });
});

describe('chain (simple colouring)', () => {
  test('clears a digit from any cell seeing both colours of a chain', () => {
    // Conjugate pairs for 4: row 0 links 0-4, column 0 links 0-27,
    // column 4 links 4-40. Colouring gives {0,40} one colour, {4,27} the other.
    // Cells 30 and 32 each see one of each, so 4 cannot go in either.
    const state = stateWithCandidates({
      0: [4, 5],
      4: [4, 5],
      27: [4, 6],
      40: [4, 7],
      30: [4, 8],
      32: [4, 9],
    });
    const step = findChain(state);
    expect(step?.technique).toBe('chain');
    expect(eliminationsOf(step)).toEqual([
      { cell: 30, digit: 4 },
      { cell: 32, digit: 4 },
    ]);
  });

  test('finds nothing when a digit has no conjugate pairs', () => {
    expect(findChain(stateWithCandidates({ 0: [4, 5], 30: [4, 8], 60: [4, 9] }))).toBeNull();
  });
});

describe('techniques never invent candidates', () => {
  test('every elimination names a digit the cell actually held', () => {
    const state = stateWithCandidates({
      0: [1, 2],
      1: [1, 2],
      2: [1, 2, 3],
      3: [2, 4],
    });
    for (const { cell, digit } of eliminationsOf(findNakedPair(state))) {
      expect(digitsOf(state.candidates[cell] ?? 0)).toContain(digit);
    }
  });
});
