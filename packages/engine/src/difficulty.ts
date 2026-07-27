import { analyse } from './solver/index';
import { rankOf } from './solver/step';
import { DIFFICULTIES } from './types';
import type { Difficulty, Grid } from './types';

/**
 * Given counts, from the design. The generator digs to these; they no longer
 * rate anything. Even numbers throughout, which is why digging carries no
 * 180-degree symmetry: symmetric digging removes cells in pairs from a full
 * grid and can only ever leave an odd count.
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
 * This bounds a band from above during generation. It does not rate anything —
 * that is the score's job.
 */
export const TECHNIQUE_CEILINGS: Readonly<Record<Difficulty, number>> = {
  easy: rankOf('hiddenSingle'),
  medium: rankOf('nakedTriple'),
  hard: rankOf('boxLine'),
  expert: rankOf('chain'),
};

/**
 * Lowest score in each band, in naked singles. Calibrated by
 * `scripts/calibrate.ts` against the weights in `TECHNIQUE_WEIGHTS` — change a
 * weight or the technique ladder and these must be re-derived, or every puzzle
 * silently re-rates.
 *
 * For scale: a puzzle solved entirely by naked singles scores `81 - givens`, so
 * the singles-only baselines are Easy 43, Medium 47, Hard 51, Expert 57. The
 * Hard and Expert floors sit clear of their baselines — 7 and 26 points of
 * technique work respectively — which is what makes those labels mean "this
 * needs real technique" rather than "this has few digits showing".
 *
 * Calibrated over 500 digs per band. In-band rates for a single dig: Easy 97%,
 * Medium 95%, Hard 42%, Expert 26%.
 */
export const SCORE_FLOORS: Readonly<Record<Difficulty, number>> = {
  easy: 0,
  medium: 47,
  hard: 58,
  expert: 83,
};

/** The band a score falls in. */
export function bandForScore(score: number): Difficulty {
  let band: Difficulty = 'easy';
  for (const difficulty of DIFFICULTIES) {
    if (score >= SCORE_FLOORS[difficulty]) band = difficulty;
  }
  return band;
}

/**
 * How much work a grid takes, in naked singles: the summed weight of every step
 * the human solver needs. Infinite when deduction cannot finish, because the
 * player would be guessing — the hardest thing a board can ask.
 */
export function scoreOf(grid: Grid): number {
  const report = analyse(grid);
  return report.solved ? report.score : Number.POSITIVE_INFINITY;
}

/**
 * Rate a puzzle by the effort its solve demands.
 *
 * One axis, not two. Given count is not consulted: it is already implicit,
 * since every placement costs at least one point and a puzzle needs
 * `81 - givens` of them. What the score adds on top is the technique work, and
 * that is the part a ceiling could never measure — a ceiling is a maximum over
 * the solve, so it throws away how *much* of the hard work there was.
 *
 * Deterministic: the solver applies techniques in a fixed order over fixed cell
 * iteration, so the same grid always scores the same.
 */
export function rate(grid: Grid): Difficulty {
  return bandForScore(scoreOf(grid));
}
