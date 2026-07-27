import { filledCount } from './grid.js';
import { analyse } from './solver/index.js';
import { MAX_RANK, rankOf } from './solver/step.js';
import { DIFFICULTIES } from './types.js';
import type { Difficulty, Grid } from './types.js';

/**
 * Given counts, from the design. Even numbers throughout, which is why the
 * generator digs without 180-degree symmetry: symmetric digging removes cells
 * in pairs from a full grid and can only ever leave an odd count.
 */
export const TARGET_GIVENS: Readonly<Record<Difficulty, number>> = {
  easy: 38,
  medium: 34,
  hard: 30,
  expert: 24,
};

/**
 * The hardest technique each band may require. The generator refuses any
 * removal that pushes a puzzle past its band's ceiling, so an Easy puzzle
 * always falls to singles and a Hard one never needs an X-wing.
 *
 * These are ceilings, not requirements. Measured over generated batches, the
 * hardest technique a puzzle *needs* is only weakly related to how many givens
 * it has: digging to 24 givens still leaves a singles-only grid most of the
 * time. So the ceiling bounds a band from above and cannot define it from
 * below — that job belongs to the given count.
 */
export const TECHNIQUE_CEILINGS: Readonly<Record<Difficulty, number>> = {
  easy: rankOf('hiddenSingle'),
  medium: rankOf('nakedTriple'),
  hard: rankOf('boxLine'),
  expert: rankOf('chain'),
};

/** Lowest given count still inside each band. */
const GIVEN_THRESHOLDS: ReadonlyArray<readonly [Difficulty, number]> = [
  ['easy', 37],
  ['medium', 33],
  ['hard', 27],
];

/**
 * The band a given count implies on its own. This is the primary axis: it is
 * what the design specifies per band, and it is what a player feels — a grid
 * with fewer starting digits takes longer to read however simple its logic.
 */
export function bandForGivens(givens: number): Difficulty {
  for (const [difficulty, floor] of GIVEN_THRESHOLDS) {
    if (givens >= floor) return difficulty;
  }
  return 'expert';
}

/** The band a technique ceiling implies on its own. */
export function bandForCeiling(ceiling: number): Difficulty {
  if (ceiling > MAX_RANK) return 'expert';
  for (const difficulty of DIFFICULTIES) {
    if (ceiling <= TECHNIQUE_CEILINGS[difficulty]) return difficulty;
  }
  return 'expert';
}

/** The harder of two bands. */
export function hardestBand(a: Difficulty, b: Difficulty): Difficulty {
  return DIFFICULTIES.indexOf(a) >= DIFFICULTIES.indexOf(b) ? a : b;
}

/**
 * Rate a puzzle on both axes and take the harder answer.
 *
 * Given count sets the baseline; the technique ceiling can only raise it. A
 * grid that needs an X-wing is Expert however generous its givens, and a grid
 * with 24 givens is Expert even if it happens to fall to singles. A grid
 * deduction cannot finish at all rates Expert — the player would be guessing,
 * which is the hardest thing a board can ask.
 *
 * Deterministic: the solver applies techniques in a fixed order over fixed cell
 * iteration, so the same grid always yields the same rating.
 */
export function rate(grid: Grid): Difficulty {
  const report = analyse(grid);
  const byTechnique = report.solved ? bandForCeiling(report.ceiling) : 'expert';
  return hardestBand(byTechnique, bandForGivens(filledCount(grid)));
}
