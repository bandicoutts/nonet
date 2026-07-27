/**
 * What makes a date into a puzzle.
 *
 * A daily is defined entirely by its date: the seed is derived from it, the
 * difficulty comes from the weekday, and the puzzle number is a count of days.
 * Nothing is stored, so any edition can be rebuilt from its date alone and the
 * archive survives losing the table (NONET-9).
 *
 * This lives in the engine rather than the app or the edge function because
 * both need it and they must agree exactly. A guest resolving "today's puzzle"
 * in the browser and the publish job minting it on the server are computing the
 * same thing, and one implementation is the only way that stays true.
 *
 * **Everything here is frozen.** Change the hash, the rhythm or the epoch and
 * every past edition becomes a different puzzle from the one people played.
 */
import type { Difficulty } from './types.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/**
 * The first daily. Puzzle number counts from here, so No. 1 is this date.
 *
 * The design prototype shows "No. 1247", which implies a launch offset rather
 * than a true first edition. Moving the epoch back is a one-line change and the
 * only thing it affects is the number in the share text — but it must be
 * decided **before** launch, because shifting it afterwards renumbers editions
 * people have already shared.
 */
export const PUZZLE_EPOCH = '2026-07-27';

/**
 * Mon Easy · Tue–Wed Medium · Thu–Fri Hard · Sat Expert · Sun Hard.
 *
 * Keyed by UTC weekday, `0` being Sunday, to match `Date.getUTCDay`. The week
 * ramps and then resolves: the hardest puzzle lands on Saturday, when people
 * have time for it, and Sunday steps back down without returning to Monday's
 * ease.
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAILY_RHYTHM: Readonly<Record<Weekday, Difficulty>> = {
  0: 'hard',
  1: 'easy',
  2: 'medium',
  3: 'medium',
  4: 'hard',
  5: 'hard',
  6: 'expert',
};

function assertIsoDate(date: string): void {
  if (!ISO_DATE.test(date)) {
    throw new Error(`A daily date must be an ISO date like 2026-07-27, received "${date}"`);
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`"${date}" is not a real ISO date`);
  }
}

/** Midnight UTC on that date. Dates are handled in UTC throughout — see below. */
function utcMidnight(date: string): Date {
  assertIsoDate(date);
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * The generator seed for a date.
 *
 * FNV-1a, 32-bit. Chosen because it is short enough to read, has no
 * dependencies, and — most importantly — is a fixed published algorithm rather
 * than something that could be "improved" later. The output is forced to
 * unsigned so it never arrives at a `bigint` column as a negative.
 *
 * Consecutive dates differ in one or two characters, and FNV-1a's avalanche is
 * good enough that neighbouring days produce unrelated seeds; the suite asserts
 * no collisions across a decade.
 */
export function dailySeed(date: string): number {
  assertIsoDate(date);

  let hash = 0x811c9dc5;
  for (let i = 0; i < date.length; i += 1) {
    hash ^= date.charCodeAt(i);
    // The FNV prime, 16777619, by shift-and-add so the maths stays in 32 bits.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }

  return hash >>> 0;
}

/**
 * The band for a date, from the weekly rhythm.
 *
 * Read in **UTC**, because the daily is one shared grid published at 00:05 UTC:
 * the edition's weekday is a property of the edition, not of whoever is looking
 * at it. A player's own timezone decides their *streak* day (NONET-9), which is
 * a different question with a different answer.
 */
export function dailyDifficulty(date: string): Difficulty {
  // `getUTCDay` is specified to return 0-6, so the cast is a statement of that
  // rather than an assumption — and typing the rhythm by literal weekday means
  // a missing day is a compile error rather than a silent fallback.
  const day = utcMidnight(date).getUTCDay() as Weekday;
  return DAILY_RHYTHM[day];
}

/**
 * The edition number shown in the share text.
 *
 * Days since the epoch, counting from one — deliberately not a stored counter.
 * A counter that drifted or skipped a day would shift every subsequent puzzle
 * and stop matching what players actually saw (NONET-9). Computed from UTC
 * midnights, so a daylight-saving boundary cannot add or lose a day.
 */
export function puzzleNumber(date: string): number {
  const days = (utcMidnight(date).getTime() - utcMidnight(PUZZLE_EPOCH).getTime()) / DAY_MS;
  return Math.round(days) + 1;
}
