/**
 * Derives the score thresholds in `SCORE_FLOORS`.
 *
 *     pnpm --filter @nonet/engine calibrate [samples]
 *
 * Band thresholds are only valid for one weight table and one technique ladder.
 * Change `TECHNIQUE_WEIGHTS`, add a technique, or reorder `TECHNIQUE_ORDER`, and
 * the thresholds are silently wrong — every puzzle re-rates and nothing fails.
 * So this is checked in: rerun it and paste the literal it prints.
 *
 * Method: dig `samples` puzzles at each band's design given count with no score
 * filtering, then set each band's floor at the percentile of its own
 * distribution that leaves `TARGET_ACCEPTANCE` of digs qualifying.
 *
 * Why not simply separate the four distributions optimally? Because they are
 * separated mostly by their singles-only baseline of `81 - givens`, so the
 * best-separating thresholds just recover given-count banding — the thing the
 * score exists to replace. Requiring a band to clear its own baseline by a
 * margin is what makes the label mean "this much work" rather than "this many
 * digits showing", and the acceptance target is the knob that sets the margin.
 * Lower acceptance buys a harder, more distinctive band and costs re-rolls.
 */
import { SCORE_FLOORS, TARGET_GIVENS } from '../src/difficulty.ts';
import { digToTarget } from '../src/generate.ts';
import { createRng } from '../src/rng.ts';
import { DIFFICULTIES } from '../src/types.ts';
import type { Difficulty } from '../src/types.ts';

const SAMPLES = Number(process.argv[2] ?? 500);
const SEED_BASE = 1_000_000;

/**
 * The share of digs at each band's given count that should qualify for it.
 *
 * A product decision, not a measurement. Easy and Medium are near-universal
 * because those bands are honestly just "a short grid of scanning" and holding
 * out for rarer specimens would buy nothing. Hard and Expert are deliberately
 * selective: an Expert puzzle should demand technique a player can feel, and at
 * 25% that costs about four dig attempts, which is nothing for something
 * generated once a day.
 */
const TARGET_ACCEPTANCE: Readonly<Record<Difficulty, number>> = {
  easy: 1,
  medium: 0.95,
  hard: 0.4,
  expert: 0.25,
};

function write(line: string): void {
  process.stdout.write(`${line}\n`);
}

function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
}

/** The score leaving `acceptance` of the distribution at or above it. */
function floorFor(sorted: readonly number[], acceptance: number): number {
  return percentile(sorted, Math.max(0, 1 - acceptance));
}

function collect(difficulty: Difficulty): number[] {
  const scores: number[] = [];

  for (let i = 0; scores.length < SAMPLES && i < SAMPLES * 4; i += 1) {
    const dug = digToTarget(difficulty, createRng(SEED_BASE + i));
    if (dug !== null) scores.push(dug.score);
  }

  return scores.sort((a, b) => a - b);
}

write(`Calibrating against ${SAMPLES} digs per band.\n`);

const distributions = new Map<Difficulty, number[]>();

for (const difficulty of DIFFICULTIES) {
  const scores = collect(difficulty);
  distributions.set(difficulty, scores);

  write(
    `${difficulty.padEnd(7)} givens ${String(TARGET_GIVENS[difficulty]).padStart(2)}  ` +
      `n=${scores.length}  ` +
      `min ${percentile(scores, 0)}  p05 ${percentile(scores, 0.05)}  ` +
      `p25 ${percentile(scores, 0.25)}  p50 ${percentile(scores, 0.5)}  ` +
      `p75 ${percentile(scores, 0.75)}  p95 ${percentile(scores, 0.95)}  ` +
      `max ${percentile(scores, 1)}`,
  );
}

const floors: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
let previous = 0;

for (const difficulty of DIFFICULTIES) {
  if (difficulty === 'easy') {
    floors.easy = 0;
    continue;
  }

  const scores = distributions.get(difficulty) ?? [];
  // Floors must ascend, or a band would be unreachable.
  floors[difficulty] = Math.max(previous + 1, floorFor(scores, TARGET_ACCEPTANCE[difficulty]));
  previous = floors[difficulty];
}

write('\nAcceptance — the share of digs at each target that land in band:');

for (const difficulty of DIFFICULTIES) {
  const scores = distributions.get(difficulty) ?? [];
  const index = DIFFICULTIES.indexOf(difficulty);
  const next = DIFFICULTIES[index + 1];
  const upperBound = next === undefined ? Number.POSITIVE_INFINITY : floors[next];

  const inBand = scores.filter(
    (score) => score >= floors[difficulty] && score < upperBound,
  ).length;

  const rate = scores.length === 0 ? 0 : inBand / scores.length;
  const attempts = rate === 0 ? Infinity : 1 / rate;

  write(
    `  ${difficulty.padEnd(7)} ${String(Math.round(rate * 100)).padStart(3)}%  ` +
      `~${attempts.toFixed(1)} attempts per puzzle`,
  );
}

write('\nPaste into src/difficulty.ts:\n');
write('export const SCORE_FLOORS: Readonly<Record<Difficulty, number>> = {');
for (const difficulty of DIFFICULTIES) {
  write(`  ${difficulty}: ${floors[difficulty]},`);
}
write('};');

const changed = DIFFICULTIES.some((difficulty) => floors[difficulty] !== SCORE_FLOORS[difficulty]);
write(changed ? '\nThresholds differ from the ones in source.' : '\nMatches source.');
