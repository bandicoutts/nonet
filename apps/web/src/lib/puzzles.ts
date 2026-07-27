/**
 * Choosing which puzzle to play, and tracking attempts at it.
 *
 * The daily is **generated locally, not fetched.** Everything about it is
 * derived from the date (NONET-16), so the browser can mint the identical grid
 * without a round trip — which means the daily still works when Supabase is
 * down, and a guest never touches the network to play. The database row is only
 * needed when a solve is recorded or a percentile is wanted, and it is resolved
 * then, by `(kind, difficulty, seed)`.
 */
import { DIFFICULTIES, currentEdition, dailyDifficulty, dailySeed } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';
import { readSolves } from './storage';
import type { PuzzleRef } from './storage';

/** How many puzzles per band `seed.sql` holds. */
export const PRACTICE_BANK_SIZE = 1000;

const ATTEMPT_PREFIX = 'nonet:attempt:';

/** The edition a player should be looking at right now. */
export function dailyRef(at: Date = new Date()): PuzzleRef {
  const date = currentEdition(at);
  return { kind: 'daily', difficulty: dailyDifficulty(date), seed: dailySeed(date) };
}

/** The date of the edition a ref refers to, for anything that needs to say it. */
export function editionDate(at: Date = new Date()): string {
  return currentEdition(at);
}

/**
 * Pick a practice puzzle the player has not already solved.
 *
 * Random rather than sequential, because sequential would give every player the
 * same order and make "practice" feel like a second daily. Already-solved seeds
 * are excluded so a returning player does not get a grid they remember — and
 * once the whole band is exhausted the exclusion is dropped rather than
 * refusing to deal, since a repeat is better than nothing.
 *
 * `random` is injected so the choice is testable; nothing about it needs to be
 * reproducible in the way a daily does.
 */
export function pickPractice(
  difficulty: Difficulty,
  solvedSeeds: readonly number[] = solvedPracticeSeeds(difficulty),
  random: () => number = Math.random,
): PuzzleRef {
  const solved = new Set(solvedSeeds);
  const available: number[] = [];

  for (let seed = 1; seed <= PRACTICE_BANK_SIZE; seed += 1) {
    if (!solved.has(seed)) available.push(seed);
  }

  const pool = available.length > 0 ? available : range(PRACTICE_BANK_SIZE);
  const seed = pool[Math.floor(random() * pool.length)] ?? 1;

  return { kind: 'practice', difficulty, seed };
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

function solvedPracticeSeeds(difficulty: Difficulty): number[] {
  return readSolves()
    .filter((s) => s.ref.kind === 'practice' && s.ref.difficulty === difficulty)
    .map((s) => s.ref.seed);
}

/**
 * Attempts at a puzzle.
 *
 * Three mistakes lock the board. The same puzzle may be retried from scratch
 * once, and solving that retry before local midnight keeps the streak, marked
 * second attempt, with no percentile. **There is no third** — the stakes are
 * the point, and an unlimited retry is not a stake (GAME-RULES.md).
 *
 * Kept per puzzle rather than globally, so failing today's daily does not spend
 * the retry on a practice puzzle.
 */
export type Attempt = 1 | 2;

function attemptKey(ref: PuzzleRef): string {
  return `${ATTEMPT_PREFIX}${ref.kind}:${ref.difficulty}:${ref.seed}`;
}

/** How many attempts have been *used up* by a locked board. */
export function failedAttempts(ref: PuzzleRef): number {
  try {
    const raw = window.localStorage.getItem(attemptKey(ref));
    const value = raw === null ? 0 : Number(raw);
    return Number.isInteger(value) && value >= 0 ? Math.min(value, 2) : 0;
  } catch {
    return 0;
  }
}

/** Which attempt the player is on now. */
export function currentAttempt(ref: PuzzleRef): Attempt {
  return failedAttempts(ref) === 0 ? 1 : 2;
}

/** Whether a locked board can be started again. */
export function canRetry(ref: PuzzleRef): boolean {
  return failedAttempts(ref) < 2;
}

/** Record that a board locked. Called once, when the third mistake lands. */
export function recordFailure(ref: PuzzleRef): void {
  try {
    window.localStorage.setItem(attemptKey(ref), String(Math.min(failedAttempts(ref) + 1, 2)));
  } catch {
    // A player who cannot persist gets an extra retry. Preferable to blocking
    // one who legitimately has it.
  }
}

/**
 * Read a puzzle ref out of URL parameters.
 *
 * The Solved screen is a route of its own, so which puzzle it describes has to
 * survive a reload and a bookmark — which means it lives in the URL, and the URL
 * is untrusted input. Anything unparseable is `null` rather than a throw or a
 * guess: the caller sends the player somewhere that has a puzzle, and nobody
 * sees an error for typing in an address.
 *
 * A repeated parameter arrives as an array and is rejected outright rather than
 * having its first value taken, since there is no honest reason for one.
 */
export function parsePuzzleRef(
  params: Record<string, string | string[] | undefined>,
): PuzzleRef | null {
  const kind = single(params['kind']);
  const difficulty = single(params['difficulty']);
  const seed = single(params['seed']);

  if (kind !== 'daily' && kind !== 'practice') return null;
  if (difficulty === null || !(DIFFICULTIES as readonly string[]).includes(difficulty)) return null;
  if (seed === null || !/^\d+$/.test(seed)) return null;

  return { kind, difficulty: difficulty as Difficulty, seed: Number(seed) };
}

function single(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/** The query string that names a puzzle, for links into `/solved`. */
export function refParams(ref: PuzzleRef): string {
  return new URLSearchParams({
    kind: ref.kind,
    difficulty: ref.difficulty,
    seed: String(ref.seed),
  }).toString();
}
