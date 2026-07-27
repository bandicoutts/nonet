import { describe, expect, test } from 'vitest';
import { DIFFICULTIES } from '../src/types';
import type { Difficulty } from '../src/types';
import { filledCount, formatGrid } from '../src/grid';
import {
  SCORE_FLOORS,
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForScore,
  rate,
  scoreOf,
} from '../src/difficulty';
import {
  GIVEN_TOLERANCE,
  digToTarget,
  generatePuzzle,
  generateSolution,
} from '../src/generate';
import { createRng } from '../src/rng';
import { analyse } from '../src/solver/index';
import { hasUniqueSolution } from '../src/uniqueness';
import { isSolved } from '../src/validate';

describe('generateSolution', () => {
  test('produces a complete, legal grid', () => {
    expect(isSolved(generateSolution(createRng(1)))).toBe(true);
  });

  test('the same seed gives the same grid', () => {
    expect(formatGrid(generateSolution(createRng(42)))).toBe(
      formatGrid(generateSolution(createRng(42))),
    );
  });

  test('different seeds give different grids', () => {
    expect(formatGrid(generateSolution(createRng(1)))).not.toBe(
      formatGrid(generateSolution(createRng(2))),
    );
  });
});

describe('generatePuzzle', () => {
  test.each(DIFFICULTIES)('%s puzzles have exactly one solution', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 1000 + DIFFICULTIES.indexOf(difficulty));
    expect(hasUniqueSolution(puzzle.givens)).toBe(true);
  });

  test.each(DIFFICULTIES)('%s puzzles rate as requested', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 2000 + DIFFICULTIES.indexOf(difficulty));
    expect(puzzle.difficulty).toBe(difficulty);
    expect(rate(puzzle.givens)).toBe(difficulty);
  });

  test.each(DIFFICULTIES)('%s puzzles land near the design given count', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 3000 + DIFFICULTIES.indexOf(difficulty));
    const target = TARGET_GIVENS[difficulty];
    expect(puzzle.givenCount).toBe(filledCount(puzzle.givens));
    // Digging stops the moment it reaches the target, so a puzzle is never
    // sparser than the design asks — only, occasionally, a little denser when
    // no further cell can be cleared without admitting a second solution.
    expect(puzzle.givenCount).toBeGreaterThanOrEqual(target);
    expect(puzzle.givenCount).toBeLessThanOrEqual(target + GIVEN_TOLERANCE);
  });

  test.each(DIFFICULTIES)('%s puzzles stay under their technique ceiling', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 6000 + DIFFICULTIES.indexOf(difficulty));
    expect(puzzle.ceiling).toBeLessThanOrEqual(TECHNIQUE_CEILINGS[difficulty]);
    expect(puzzle.ceiling).toBe(analyse(puzzle.givens).ceiling);
  });

  test.each(DIFFICULTIES)('%s puzzles carry a score inside the band', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 7000 + DIFFICULTIES.indexOf(difficulty));
    expect(puzzle.score).toBe(scoreOf(puzzle.givens));
    expect(bandForScore(puzzle.score)).toBe(difficulty);
    expect(puzzle.score).toBeGreaterThanOrEqual(SCORE_FLOORS[difficulty]);
  });

  test.each(DIFFICULTIES)('%s puzzles never require a guess', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 4000 + DIFFICULTIES.indexOf(difficulty));
    expect(analyse(puzzle.givens).solved).toBe(true);
  });

  test.each(DIFFICULTIES)('%s givens agree with the stated solution', (difficulty: Difficulty) => {
    const puzzle = generatePuzzle(difficulty, 5000 + DIFFICULTIES.indexOf(difficulty));
    expect(isSolved(puzzle.solution)).toBe(true);
    puzzle.givens.forEach((value, index) => {
      if (value !== 0) expect(puzzle.solution[index]).toBe(value);
    });
  });

  test('the same seed and difficulty give the same puzzle', () => {
    const a = generatePuzzle('medium', 777);
    const b = generatePuzzle('medium', 777);
    expect(formatGrid(a.givens)).toBe(formatGrid(b.givens));
    expect(formatGrid(a.solution)).toBe(formatGrid(b.solution));
  });

  test('different seeds give different puzzles', () => {
    const a = generatePuzzle('medium', 778);
    const b = generatePuzzle('medium', 779);
    expect(formatGrid(a.givens)).not.toBe(formatGrid(b.givens));
  });

  test('records the seed it used so a puzzle can be reproduced', () => {
    const puzzle = generatePuzzle('hard', 555);
    expect(generatePuzzle('hard', puzzle.seed).givens).toEqual(puzzle.givens);
  });

  test('digs without rotational symmetry, since the design given counts are even', () => {
    // 180-degree symmetry removes cells in pairs, which can only ever produce
    // odd given counts. Easy targets 38, so symmetry is ruled out by design.
    expect(TARGET_GIVENS.easy % 2).toBe(0);
    const puzzle = generatePuzzle('easy', 91);
    const symmetric = puzzle.givens.every(
      (value, index) => (value !== 0) === (puzzle.givens[80 - index] !== 0),
    );
    expect(symmetric).toBe(false);
  });
});

describe('digToTarget', () => {
  test('digs to the design given count under the band ceiling', () => {
    const dug = digToTarget('hard', createRng(4242));
    expect(dug).not.toBeNull();
    expect(dug?.givenCount).toBeGreaterThanOrEqual(TARGET_GIVENS.hard);
    expect(dug?.ceiling).toBeLessThanOrEqual(TECHNIQUE_CEILINGS.hard);
  });

  test('does not filter on score, so calibration sees the raw distribution', () => {
    // Whether a dug puzzle lands in band is exactly what calibration measures,
    // so this rung must not pre-select for it. Over a run of seeds at the Hard
    // target, some digs score below the Hard floor — that is the point.
    const scores = Array.from({ length: 12 }, (_, i) => digToTarget('hard', createRng(i))?.score ?? 0);
    expect(scores.some((score) => score < SCORE_FLOORS.hard)).toBe(true);
  });

  test('is deterministic for a seed', () => {
    expect(digToTarget('medium', createRng(11))?.givens).toEqual(
      digToTarget('medium', createRng(11))?.givens,
    );
  });
});
