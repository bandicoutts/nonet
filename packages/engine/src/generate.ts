import { canPlace } from './validate';
import { cloneGrid, emptyGrid, filledCount } from './grid';
import { SCORE_FLOORS, TARGET_GIVENS, TECHNIQUE_CEILINGS, bandForScore } from './difficulty';
import { createRng } from './rng';
import type { Rng } from './rng';
import { analyse } from './solver/index';
import { CELL_COUNT, DIGITS } from './types';
import type { CellIndex, Difficulty, Grid, MutableGrid } from './types';
import { hasUniqueSolution } from './uniqueness';

/**
 * How far above the design given count a puzzle may finish. Digging stops when
 * no further cell can be cleared without admitting a second solution, and that
 * stall point occasionally sits a little above the Expert target.
 */
export const GIVEN_TOLERANCE = 3;

/**
 * Dig orders tried before giving up on a difficulty.
 *
 * The budget is set by the hardest band. Measured in-band rates for a single
 * dig are roughly Easy 98%, Medium 98%, Hard 42%, Expert 23%, so Expert needs
 * about 4 attempts on average; 40 puts the odds of outright failure near 4 in
 * 100,000. Generation runs once a day for the daily and once per bank seed, so
 * spending a few attempts to land the band is free in practice.
 */
export const MAX_ATTEMPTS = 40;

export interface GeneratedPuzzle {
  /** The puzzle as presented, 0 for the cells the player fills. */
  readonly givens: Grid;
  readonly solution: Grid;
  readonly difficulty: Difficulty;
  readonly givenCount: number;
  /** The hardest technique rank the solve requires. */
  readonly ceiling: number;
  /** Summed weight of the solve, in naked singles. This is what sets the band. */
  readonly score: number;
  /** The seed passed to `generatePuzzle`; regenerating with it repeats this puzzle. */
  readonly seed: number;
}

/** A complete, legal grid built by backtracking over a shuffled digit order. */
export function generateSolution(rng: Rng): Grid {
  const grid = cloneGrid(emptyGrid());
  if (!fill(grid, 0, rng)) throw new Error('Failed to build a solution grid');
  return grid;
}

function fill(grid: MutableGrid, cell: CellIndex, rng: Rng): boolean {
  if (cell >= CELL_COUNT) return true;
  if (grid[cell] !== 0) return fill(grid, cell + 1, rng);

  for (const digit of rng.shuffle(DIGITS)) {
    if (!canPlace(grid, cell, digit)) continue;
    grid[cell] = digit;
    if (fill(grid, cell + 1, rng)) return true;
    grid[cell] = 0;
  }

  return false;
}

/**
 * One dig: build a solution, then clear cells until the band's given count is
 * reached. **No score filtering** — the caller decides whether the result is in
 * band. `scripts/calibrate.ts` depends on that, since the whole point of
 * calibration is to measure how raw digs are distributed.
 *
 * Prefer `generatePuzzle` unless you are calibrating.
 *
 * Returns null when digging stalls well above the target given count.
 */
export function digToTarget(difficulty: Difficulty, rng: Rng): GeneratedPuzzle | null {
  const solution = generateSolution(rng);
  const givens = cloneGrid(solution);

  const target = TARGET_GIVENS[difficulty];
  const ceilingBound = TECHNIQUE_CEILINGS[difficulty];

  let count = CELL_COUNT;

  for (const cell of rng.shuffle(Array.from({ length: CELL_COUNT }, (_, i) => i))) {
    if (count <= target) break;

    const removed = givens[cell];
    if (removed === undefined || removed === 0) continue;

    givens[cell] = 0;

    // Never accept a removal that admits a second solution.
    if (!hasUniqueSolution(givens)) {
      givens[cell] = removed;
      continue;
    }

    // Never accept a removal the human solver cannot recover from, or one that
    // pushes the puzzle past its band's technique ceiling.
    const report = analyse(givens);
    if (!report.solved || report.ceiling > ceilingBound) {
      givens[cell] = removed;
      continue;
    }

    count -= 1;
  }

  if (count > target + GIVEN_TOLERANCE) return null;
  if (!hasUniqueSolution(givens)) return null;

  const report = analyse(givens);
  if (!report.solved) return null;

  return {
    givens,
    solution,
    difficulty,
    givenCount: filledCount(givens),
    ceiling: report.ceiling,
    score: report.score,
    seed: 0,
  };
}

/**
 * Generate a puzzle of the requested difficulty.
 *
 * **Uniqueness is guaranteed by construction.** Digging starts from a complete
 * solution, and a cell is only cleared if the grid still has exactly one
 * solution afterwards — so there is no point at which a second solution can
 * appear. The finished puzzle is checked once more before it is returned.
 *
 * **No puzzle ever requires a guess**, for the same reason: a removal is only
 * accepted if the human solver can still finish the grid, within the band's
 * technique ceiling.
 *
 * **The band is what it says.** Given count is held to the design target and
 * the dig is re-rolled until the puzzle's score lands in the band, so an Expert
 * puzzle demands Expert-level work rather than merely showing fewer digits.
 */
export function generatePuzzle(difficulty: Difficulty, seed: number): GeneratedPuzzle {
  const seeds = createRng(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const rng = createRng(attempt === 0 ? seed : seeds.int(0x7fffffff));
    const candidate = digToTarget(difficulty, rng);
    if (candidate === null) continue;
    if (bandForScore(candidate.score) !== difficulty) continue;

    return { ...candidate, seed };
  }

  throw new Error(
    `Could not generate a ${difficulty} puzzle from seed ${seed} in ${MAX_ATTEMPTS} attempts ` +
      `(score floor ${SCORE_FLOORS[difficulty]})`,
  );
}
