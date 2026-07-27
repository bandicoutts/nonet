import { canPlace } from './validate.js';
import { cloneGrid, emptyGrid, filledCount } from './grid.js';
import { TARGET_GIVENS, TECHNIQUE_CEILINGS, rate } from './difficulty.js';
import { createRng } from './rng.js';
import type { Rng } from './rng.js';
import { analyse } from './solver/index.js';
import { CELL_COUNT, DIGITS } from './types.js';
import type { CellIndex, Difficulty, Grid, MutableGrid } from './types.js';
import { hasUniqueSolution } from './uniqueness.js';

/**
 * How far above the design given count a puzzle may finish. Digging stops when
 * no further cell can be cleared without admitting a second solution, and that
 * stall point occasionally sits a little above the Expert target.
 */
export const GIVEN_TOLERANCE = 3;

/** Dig orders tried before giving up on a difficulty. */
export const MAX_ATTEMPTS = 12;

export interface GeneratedPuzzle {
  /** The puzzle as presented, 0 for the cells the player fills. */
  readonly givens: Grid;
  readonly solution: Grid;
  readonly difficulty: Difficulty;
  readonly givenCount: number;
  /** The hardest technique rank the solve requires. */
  readonly ceiling: number;
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
 */
export function generatePuzzle(difficulty: Difficulty, seed: number): GeneratedPuzzle {
  const seeds = createRng(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const rng = createRng(attempt === 0 ? seed : seeds.int(0x7fffffff));
    const candidate = attemptPuzzle(difficulty, rng, seed);
    if (candidate !== null) return candidate;
  }

  throw new Error(
    `Could not generate a ${difficulty} puzzle from seed ${seed} in ${MAX_ATTEMPTS} attempts`,
  );
}

function attemptPuzzle(difficulty: Difficulty, rng: Rng, seed: number): GeneratedPuzzle | null {
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
  if (rate(givens) !== difficulty) return null;
  if (!hasUniqueSolution(givens)) return null;

  return {
    givens,
    solution,
    difficulty,
    givenCount: filledCount(givens),
    ceiling: analyse(givens).ceiling,
    seed,
  };
}
