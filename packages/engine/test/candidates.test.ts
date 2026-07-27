import { describe, expect, test } from 'vitest';
import {
  ALL_CANDIDATES,
  computeCandidates,
  countCandidates,
  digitsOf,
  hasCandidate,
  maskOf,
  removeCandidate,
  singleCandidate,
  withCandidate,
} from '../src/candidates.js';
import { parseGrid } from '../src/grid.js';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION, EMPTY_PUZZLE } from './fixtures.js';

describe('candidate masks', () => {
  test('maskOf and digitsOf round-trip', () => {
    expect(digitsOf(maskOf([1, 5, 9]))).toEqual([1, 5, 9]);
    expect(digitsOf(maskOf([]))).toEqual([]);
  });

  test('ALL_CANDIDATES holds every digit', () => {
    expect(digitsOf(ALL_CANDIDATES)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(countCandidates(ALL_CANDIDATES)).toBe(9);
  });

  test('hasCandidate reports membership', () => {
    const mask = maskOf([2, 7]);
    expect(hasCandidate(mask, 2)).toBe(true);
    expect(hasCandidate(mask, 7)).toBe(true);
    expect(hasCandidate(mask, 3)).toBe(false);
  });

  test('withCandidate and removeCandidate are pure', () => {
    const mask = maskOf([4]);
    expect(digitsOf(withCandidate(mask, 6))).toEqual([4, 6]);
    expect(digitsOf(removeCandidate(mask, 4))).toEqual([]);
    expect(digitsOf(mask)).toEqual([4]);
  });

  test('removing an absent digit is a no-op', () => {
    const mask = maskOf([4]);
    expect(removeCandidate(mask, 9)).toBe(mask);
  });

  test('singleCandidate returns the digit only when exactly one remains', () => {
    expect(singleCandidate(maskOf([6]))).toBe(6);
    expect(singleCandidate(maskOf([6, 7]))).toBeNull();
    expect(singleCandidate(maskOf([]))).toBeNull();
  });
});

describe('computeCandidates', () => {
  test('filled cells carry no candidates', () => {
    const candidates = computeCandidates(parseGrid(CLASSIC_PUZZLE));
    expect(candidates[0]).toBe(0);
    expect(candidates[1]).toBe(0);
  });

  test('every cell on an empty board takes any digit', () => {
    const candidates = computeCandidates(parseGrid(EMPTY_PUZZLE));
    for (let index = 0; index < 81; index += 1) {
      expect(candidates[index]).toBe(ALL_CANDIDATES);
    }
  });

  test('a cell excludes digits used by its row, column and box', () => {
    const candidates = computeCandidates(parseGrid(CLASSIC_PUZZLE));
    // Cell 2: row 0 has 5,3,7; column 2 has 8; box 0 has 5,3,6,9,8.
    expect(digitsOf(candidates[2] ?? 0)).toEqual([1, 2, 4]);
  });

  test('a solved grid leaves no candidates anywhere', () => {
    const candidates = computeCandidates(parseGrid(CLASSIC_SOLUTION));
    expect(candidates.every((mask) => mask === 0)).toBe(true);
  });
});
