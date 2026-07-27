import { describe, expect, test } from 'vitest';
import { parseGrid } from '../src/grid.js';
import {
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForCeiling,
  bandForGivens,
  hardestBand,
  rate,
} from '../src/difficulty.js';
import { rankOf } from '../src/solver/step.js';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION, TWO_SOLUTION_PUZZLE } from './fixtures.js';

describe('design targets', () => {
  test('given counts match the design', () => {
    expect(TARGET_GIVENS).toEqual({ easy: 38, medium: 34, hard: 30, expert: 24 });
  });

  test('technique ceilings rise with the band and top out at the ladder', () => {
    expect(TECHNIQUE_CEILINGS.easy).toBe(rankOf('hiddenSingle'));
    expect(TECHNIQUE_CEILINGS.medium).toBe(rankOf('nakedTriple'));
    expect(TECHNIQUE_CEILINGS.hard).toBe(rankOf('boxLine'));
    expect(TECHNIQUE_CEILINGS.expert).toBe(rankOf('chain'));
  });
});

describe('bandForGivens', () => {
  test('puts each design target in its own band', () => {
    expect(bandForGivens(TARGET_GIVENS.easy)).toBe('easy');
    expect(bandForGivens(TARGET_GIVENS.medium)).toBe('medium');
    expect(bandForGivens(TARGET_GIVENS.hard)).toBe('hard');
    expect(bandForGivens(TARGET_GIVENS.expert)).toBe('expert');
  });

  test('bands are contiguous across the boundaries', () => {
    expect(bandForGivens(37)).toBe('easy');
    expect(bandForGivens(36)).toBe('medium');
    expect(bandForGivens(33)).toBe('medium');
    expect(bandForGivens(32)).toBe('hard');
    expect(bandForGivens(27)).toBe('hard');
    expect(bandForGivens(26)).toBe('expert');
  });

  test('a full grid is easy', () => {
    expect(bandForGivens(81)).toBe('easy');
  });

  test('tolerates the generator finishing a little above the expert target', () => {
    expect(bandForGivens(25)).toBe('expert');
    expect(bandForGivens(26)).toBe('expert');
  });
});

describe('bandForCeiling', () => {
  test('maps every rank to exactly one band', () => {
    expect(bandForCeiling(1)).toBe('easy');
    expect(bandForCeiling(2)).toBe('easy');
    expect(bandForCeiling(3)).toBe('medium');
    expect(bandForCeiling(5)).toBe('medium');
    expect(bandForCeiling(6)).toBe('hard');
    expect(bandForCeiling(7)).toBe('hard');
    expect(bandForCeiling(8)).toBe('expert');
    expect(bandForCeiling(9)).toBe('expert');
  });

  test('a grid needing more than the ladder offers is expert', () => {
    expect(bandForCeiling(99)).toBe('expert');
  });

  test('a grid needing no technique at all is easy', () => {
    expect(bandForCeiling(0)).toBe('easy');
  });
});

describe('hardestBand', () => {
  test('picks the harder of two bands', () => {
    expect(hardestBand('easy', 'hard')).toBe('hard');
    expect(hardestBand('expert', 'medium')).toBe('expert');
    expect(hardestBand('medium', 'medium')).toBe('medium');
  });
});

describe('rate', () => {
  test('the given count sets the baseline band', () => {
    // 30 givens, and it falls to singles — the count is what makes it Hard.
    expect(rate(parseGrid(CLASSIC_PUZZLE))).toBe('hard');
  });

  test('the technique ceiling can only raise the band, never lower it', () => {
    // A grid deduction cannot finish is Expert whatever its given count.
    expect(rate(parseGrid(TWO_SOLUTION_PUZZLE))).toBe('expert');
  });

  test('a solved grid rates easy', () => {
    expect(rate(parseGrid(CLASSIC_SOLUTION))).toBe('easy');
  });

  test('is stable across repeated calls', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    const ratings = Array.from({ length: 5 }, () => rate(grid));
    expect(new Set(ratings).size).toBe(1);
  });
});
