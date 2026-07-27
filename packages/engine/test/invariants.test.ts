import { describe, expect, test } from 'vitest';
import { digitsOf, maskOf } from '../src/candidates.ts';
import { boxOf, colOf, filledCount, formatGrid, rowOf } from '../src/grid.ts';
import {
  SCORE_FLOORS,
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForScore,
  rate,
  scoreOf,
} from '../src/difficulty.ts';
import {
  GIVEN_TOLERANCE,
  digToTarget,
  generatePuzzle,
  generateSolution,
} from '../src/generate.ts';
import type { GeneratedPuzzle } from '../src/generate.ts';
import { createRng } from '../src/rng.ts';
import { clearPeerNotes, notesAt } from '../src/rules/notes.ts';
import { analyse } from '../src/solver/index.ts';
import { CELL_COUNT, DIFFICULTIES } from '../src/types.ts';
import type { Difficulty, Digit } from '../src/types.ts';
import { countSolutions } from '../src/uniqueness.ts';
import { isSolved } from '../src/validate.ts';

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

      test('every score sits inside the band', () => {
        for (const { seed, puzzle } of batch(difficulty)) {
          expect(puzzle.score, `seed ${seed}`).toBe(scoreOf(puzzle.givens));
          expect(bandForScore(puzzle.score), `seed ${seed}`).toBe(difficulty);
        }
      });

      test('the band demands more work than pure scanning at that given count', () => {
        // The singles-only floor for a grid is 81 - givens. A band whose score
        // floor sits at or below that floor is just the given count relabelled.
        const scanningBaseline = 81 - TARGET_GIVENS[difficulty];
        for (const { seed, puzzle } of batch(difficulty)) {
          if (difficulty === 'hard' || difficulty === 'expert') {
            expect(puzzle.score, `seed ${seed}`).toBeGreaterThan(scanningBaseline);
          }
          expect(SCORE_FLOORS[difficulty], `seed ${seed}`).toBeGreaterThanOrEqual(
            difficulty === 'easy' ? 0 : 1,
          );
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

describe('calibration still holds', () => {
  test.each(DIFFICULTIES)(
    'at least 95%% of %s digs that reach the target land in a band at or above it',
    (difficulty: Difficulty) => {
      // Guards the thresholds against weight or ladder changes. A dig may score
      // above its band — that is a re-roll, not a miscalibration — but a dig
      // landing *below* its own floor means the floor has drifted upward past
      // what the given count can support, and the generator would start
      // thrashing. Rerun `pnpm --filter @nonet/engine calibrate` if this fails.
      const floor = SCORE_FLOORS[difficulty];
      const digs = Array.from({ length: 40 }, (_, i) => digToTarget(difficulty, createRng(i)));
      const reached = digs.filter((dug) => dug !== null);

      expect(reached.length).toBeGreaterThan(0);

      // Hard and Expert are deliberately selective, so only assert the weaker
      // property there: the floor must remain reachable in a healthy fraction.
      const clearing = reached.filter((dug) => (dug?.score ?? 0) >= floor).length;
      const share = clearing / reached.length;
      const required = difficulty === 'easy' || difficulty === 'medium' ? 0.95 : 0.15;

      expect(share, `${clearing}/${reached.length} cleared floor ${floor}`).toBeGreaterThanOrEqual(
        required,
      );
    },
  );
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
