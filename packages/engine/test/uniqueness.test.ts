import { describe, expect, test } from 'vitest';
import { formatGrid, parseGrid } from '../src/grid.ts';
import { countSolutions, hasUniqueSolution, solveByBacktracking } from '../src/uniqueness.ts';
import { isSolved } from '../src/validate.ts';
import {
  CONTRADICTORY_PUZZLE,
  CLASSIC_PUZZLE,
  CLASSIC_MINUS_ONE_GIVEN,
  CLASSIC_SOLUTION,
  EMPTY_PUZZLE,
  TWO_SOLUTION_PUZZLE,
} from './fixtures.ts';

describe('solveByBacktracking', () => {
  test('solves a well-formed puzzle', () => {
    const solution = solveByBacktracking(parseGrid(CLASSIC_PUZZLE));
    expect(solution).not.toBeNull();
    expect(formatGrid(solution ?? [])).toBe(CLASSIC_SOLUTION);
  });

  test('returns null when no solution exists', () => {
    expect(solveByBacktracking(parseGrid(CONTRADICTORY_PUZZLE))).toBeNull();
  });

  test('fills an empty board with a legal solution', () => {
    const solution = solveByBacktracking(parseGrid(EMPTY_PUZZLE));
    expect(solution).not.toBeNull();
    expect(isSolved(solution ?? [])).toBe(true);
  });

  test('leaves an already solved grid alone', () => {
    const solution = solveByBacktracking(parseGrid(CLASSIC_SOLUTION));
    expect(formatGrid(solution ?? [])).toBe(CLASSIC_SOLUTION);
  });
});

describe('countSolutions', () => {
  test('a well-formed puzzle has exactly one solution', () => {
    expect(countSolutions(parseGrid(CLASSIC_PUZZLE))).toBe(1);
  });

  test('a contradictory grid has none', () => {
    expect(countSolutions(parseGrid(CONTRADICTORY_PUZZLE))).toBe(0);
  });

  test('an under-constrained puzzle has more than one', () => {
    expect(countSolutions(parseGrid(TWO_SOLUTION_PUZZLE))).toBeGreaterThan(1);
  });

  test('stops counting at the cap so an empty board terminates fast', () => {
    expect(countSolutions(parseGrid(EMPTY_PUZZLE), 2)).toBe(2);
    expect(countSolutions(parseGrid(EMPTY_PUZZLE), 5)).toBe(5);
  });

  test('a cap of 1 confirms solvability without enumerating', () => {
    expect(countSolutions(parseGrid(CLASSIC_PUZZLE), 1)).toBe(1);
  });
});

describe('hasUniqueSolution', () => {
  test('is true for a well-formed puzzle', () => {
    expect(hasUniqueSolution(parseGrid(CLASSIC_PUZZLE))).toBe(true);
  });

  test('is false when the grid admits a digit swap', () => {
    expect(hasUniqueSolution(parseGrid(TWO_SOLUTION_PUZZLE))).toBe(false);
  });

  test('removing a single given does not by itself break uniqueness', () => {
    expect(hasUniqueSolution(parseGrid(CLASSIC_MINUS_ONE_GIVEN))).toBe(true);
  });

  test('is false when there is no solution at all', () => {
    expect(hasUniqueSolution(parseGrid(CONTRADICTORY_PUZZLE))).toBe(false);
  });
});
