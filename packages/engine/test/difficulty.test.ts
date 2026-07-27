import { describe, expect, test } from 'vitest';
import { parseGrid } from '../src/grid';
import {
  SCORE_FLOORS,
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForScore,
  rate,
  scoreOf,
} from '../src/difficulty';
import { rankOf } from '../src/solver/step';
import { DIFFICULTIES } from '../src/types';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION, TWO_SOLUTION_PUZZLE } from './fixtures';

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

describe('SCORE_FLOORS', () => {
  test('easy starts at zero so every grid lands in a band', () => {
    expect(SCORE_FLOORS.easy).toBe(0);
  });

  test('floors ascend with difficulty', () => {
    const floors = DIFFICULTIES.map((difficulty) => SCORE_FLOORS[difficulty]);
    for (let i = 1; i < floors.length; i += 1) {
      expect(floors[i] ?? 0).toBeGreaterThan(floors[i - 1] ?? 0);
    }
  });

  test('the expert floor clears the singles-only baseline by a real margin', () => {
    // A 24-given puzzle solved entirely by naked singles scores 81 - 24 = 57.
    // Expert must demand meaningfully more work than that, or the band is just
    // the given count wearing a different hat.
    expect(SCORE_FLOORS.expert).toBeGreaterThan(57 + 20);
  });
});

describe('bandForScore', () => {
  test('places each floor in its own band', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(bandForScore(SCORE_FLOORS[difficulty])).toBe(difficulty);
    }
  });

  test('a score just below a floor belongs to the band beneath', () => {
    expect(bandForScore(SCORE_FLOORS.medium - 1)).toBe('easy');
    expect(bandForScore(SCORE_FLOORS.hard - 1)).toBe('medium');
    expect(bandForScore(SCORE_FLOORS.expert - 1)).toBe('hard');
  });

  test('an empty grid rates easy', () => {
    expect(bandForScore(0)).toBe('easy');
  });

  test('an unrateable grid is expert', () => {
    expect(bandForScore(Number.POSITIVE_INFINITY)).toBe('expert');
  });
});

describe('scoreOf', () => {
  test('is the solver score when deduction finishes the grid', () => {
    expect(scoreOf(parseGrid(CLASSIC_PUZZLE))).toBe(51);
  });

  test('a solved grid costs nothing', () => {
    expect(scoreOf(parseGrid(CLASSIC_SOLUTION))).toBe(0);
  });

  test('is infinite when deduction cannot finish', () => {
    expect(scoreOf(parseGrid(TWO_SOLUTION_PUZZLE))).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('rate', () => {
  test('rates by effort, not by how many digits are showing', () => {
    // 30 givens but it falls to singles: 51 points of work, which is Medium.
    // The old given-count rater called this Hard purely for being sparse.
    expect(rate(parseGrid(CLASSIC_PUZZLE))).toBe('medium');
  });

  test('a grid deduction cannot finish is expert', () => {
    expect(rate(parseGrid(TWO_SOLUTION_PUZZLE))).toBe('expert');
  });

  test('a solved grid rates easy', () => {
    expect(rate(parseGrid(CLASSIC_SOLUTION))).toBe('easy');
  });

  test('is stable across repeated calls', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    expect(new Set(Array.from({ length: 5 }, () => rate(grid))).size).toBe(1);
  });

  test('agrees with bandForScore on the same grid', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    expect(rate(grid)).toBe(bandForScore(scoreOf(grid)));
  });
});
