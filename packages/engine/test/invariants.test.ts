import { describe, expect, test } from 'vitest';
import { digitsOf, maskOf } from '../src/candidates.js';
import { boxOf, colOf, filledCount, formatGrid, rowOf } from '../src/grid.js';
import { TARGET_GIVENS, TECHNIQUE_CEILINGS, rate } from '../src/difficulty.js';
import { GIVEN_TOLERANCE, generatePuzzle, generateSolution } from '../src/generate.js';
import type { GeneratedPuzzle } from '../src/generate.js';
import { createRng } from '../src/rng.js';
import { clearPeerNotes, notesAt } from '../src/rules/notes.js';
import { analyse } from '../src/solver/index.js';
import { CELL_COUNT, DIFFICULTIES } from '../src/types.js';
import type { Difficulty, Digit } from '../src/types.js';
import { countSolutions } from '../src/uniqueness.js';
import { isSolved } from '../src/validate.js';

/**
 * Seeded fuzzing. Every case comes from a seed named in the assertion message,
 * so a failure is reproducible: rerun `generatePuzzle(difficulty, seed)`.
 *
 * Batches are generated once and shared across the assertions below —
 * generation is the expensive part, and every invariant wants the same puzzles.
 */
const BATCH_SIZE = 8;
const NOTE_CASES = 300;

function seedsFor(difficulty: Difficulty): number[] {
  const base = 10_000 * (DIFFICULTIES.indexOf(difficulty) + 1);
  return Array.from({ length: BATCH_SIZE }, (_, i) => base + i);
}

const BATCHES: ReadonlyMap<Difficulty, ReadonlyArray<{ seed: number; puzzle: GeneratedPuzzle }>> =
  new Map(
    DIFFICULTIES.map((difficulty) => [
      difficulty,
      seedsFor(difficulty).map((seed) => ({ seed, puzzle: generatePuzzle(difficulty, seed) })),
    ]),
  );

function batch(difficulty: Difficulty): ReadonlyArray<{ seed: number; puzzle: GeneratedPuzzle }> {
  return BATCHES.get(difficulty) ?? [];
}

describe('generated puzzles', () => {
  for (const difficulty of DIFFICULTIES) {
    describe(difficulty, () => {
      test('every puzzle has exactly one solution', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(countSolutions(puzzle.givens, 2), `seed ${seed}`).toBe(1);
        }
      });

      test('no puzzle ever requires a guess', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(analyse(puzzle.givens).solved, `seed ${seed}`).toBe(true);
        }
      });

      test('the batch rates where it was asked to', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(rate(puzzle.givens), `seed ${seed}`).toBe(difficulty);
          expect(puzzle.difficulty, `seed ${seed}`).toBe(difficulty);
        }
      });

      test('given counts sit in the design band', () => {
        const target = TARGET_GIVENS[difficulty];
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(puzzle.givenCount, `seed ${seed}`).toBeGreaterThanOrEqual(target);
          expect(puzzle.givenCount, `seed ${seed}`).toBeLessThanOrEqual(target + GIVEN_TOLERANCE);
        }
      });

      test('no puzzle exceeds its technique ceiling', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(puzzle.ceiling, `seed ${seed}`).toBeLessThanOrEqual(TECHNIQUE_CEILINGS[difficulty]);
        }
      });

      test('the rating is stable across runs', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          const ratings = Array.from({ length: 3 }, () => rate(puzzle.givens));
          expect(new Set(ratings).size, `seed ${seed}`).toBe(1);
        }
      });

      test('regenerating from the same seed is byte-identical', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(formatGrid(generatePuzzle(difficulty, seed).givens), `seed ${seed}`).toBe(
            formatGrid(puzzle.givens),
          );
        }
      });

      test('the solve agrees with the stated solution, givens untouched', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          const report = analyse(puzzle.givens);
          expect(formatGrid(report.grid), `seed ${seed}`).toBe(formatGrid(puzzle.solution));
          expect(filledCount(report.grid), `seed ${seed}`).toBe(CELL_COUNT);
          puzzle.givens.forEach((value, index) => {
            if (value !== 0) expect(report.grid[index], `seed ${seed} cell ${index}`).toBe(value);
          });
        }
      });
    });
  }
});

describe('generation is robust across arbitrary seeds', () => {
  test('never throws for a run of consecutive seeds', () => {
    for (let seed = 700_000; seed < 700_020; seed += 1) {
      for (const difficulty of DIFFICULTIES) {
        expect(() => generatePuzzle(difficulty, seed), `${difficulty} seed ${seed}`).not.toThrow();
      }
    }
  });
});

describe('generated solutions', () => {
  test('are always complete and legal', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      expect(isSolved(generateSolution(createRng(seed))), `seed ${seed}`).toBe(true);
    }
  });
});

describe('peer-note clearing', () => {
  test('removes exactly the placed digit from exactly the peers', () => {
    const rng = createRng(20260727);

    for (let round = 0; round < NOTE_CASES; round += 1) {
      const before = Array.from({ length: CELL_COUNT }, () =>
        maskOf(([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[]).filter(() => rng.next() < 0.5)),
      );
      const cell = rng.int(CELL_COUNT);
      const digit = (rng.int(9) + 1) as Digit;

      const after = clearPeerNotes(before, cell, digit);

      for (let other = 0; other < CELL_COUNT; other += 1) {
        const was = digitsOf(notesAt(before, other));
        const now = digitsOf(notesAt(after, other));

        if (other === cell) {
          expect(now, `round ${round}: the placed cell keeps notes`).toEqual([]);
          continue;
        }

        const isPeer =
          rowOf(other) === rowOf(cell) ||
          colOf(other) === colOf(cell) ||
          boxOf(other) === boxOf(cell);

        expect(now, `round ${round}: cell ${other}`).toEqual(
          isPeer ? was.filter((d) => d !== digit) : was,
        );
      }
    }
  });
});
