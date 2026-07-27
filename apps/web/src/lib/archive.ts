/**
 * The archive: every edition since No. 1, and what happened to it.
 *
 * An edition is entirely derived from its date (NONET-16) — number, difficulty
 * and seed — so a month can be listed without a database, and the archive is
 * browsable with Supabase down. Only the *status* comes from the player's own
 * solves.
 */
import { PUZZLE_EPOCH, currentEdition, dailyDifficulty, dailySeed, puzzleNumber } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';
import type { GuestSolve, PuzzleRef } from './storage';

const DAY_MS = 86_400_000;

/**
 * `failed` is absent, for the reason `record.ts` gives: nothing records a
 * failed *day*. A locked board writes no solve row (NONET-17) and attempts
 * carry no date, so a lost day is indistinguishable from an unopened one.
 * `copy.md` filters on Failed; that needs a schema that stores it.
 */
export type EditionStatus = 'solved' | 'unplayed' | 'today' | 'future' | 'pre-epoch';

export interface Edition {
  readonly date: string;
  readonly number: number;
  readonly difficulty: Difficulty;
  readonly ref: PuzzleRef;
  readonly status: EditionStatus;
  /** The player's time, when they have one. */
  readonly durationMs: number | null;
}

export interface Filters {
  readonly difficulties: readonly Difficulty[];
  readonly statuses: readonly EditionStatus[];
}

export const NO_FILTERS: Filters = { difficulties: [], statuses: [] };

function dayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS;
}

function toDate(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** The edition for a date, with the player's history applied. */
export function editionFor(
  date: string,
  solves: readonly GuestSolve[],
  at: Date = new Date(),
): Edition {
  const difficulty = dailyDifficulty(date);
  const seed = dailySeed(date);
  const ref: PuzzleRef = { kind: 'daily', difficulty, seed };

  /*
   * Matched on the seed alone.
   *
   * The seed is derived from the date and so is the difficulty, so the seed
   * already determines the edition — requiring the band to agree as well only
   * adds a way to *fail* to credit a solve whose stored band drifted, and
   * silently dropping a player's solve is the worst outcome available here.
   */
  const solve = solves.find((s) => s.ref.kind === 'daily' && s.ref.seed === seed);

  return {
    date,
    number: puzzleNumber(date),
    difficulty,
    ref,
    status: statusFor(date, solve !== undefined, at),
    durationMs: solve?.durationMs ?? null,
  };
}

function statusFor(date: string, solved: boolean, at: Date): EditionStatus {
  const day = dayNumber(date);
  const current = dayNumber(currentEdition(at));

  // Past the current edition there is nothing to play — the publish gate has
  // not opened yet (NONET-17).
  if (day > current) return 'future';

  /*
   * A solve outranks everything below it, including the epoch. Recording one is
   * evidence the edition existed, and letting the epoch overrule it is what put
   * two contradictory figures on the Record page (NONET-25).
   */
  if (solved) return 'solved';
  if (day === current) return 'today';
  if (day < dayNumber(PUZZLE_EPOCH)) return 'pre-epoch';
  return 'unplayed';
}

/** Every edition in a calendar month, in order. */
export function monthEditions(
  year: number,
  month: number,
  solves: readonly GuestSolve[],
  at: Date = new Date(),
): readonly Edition[] {
  const editions: Edition[] = [];
  const start = Date.UTC(year, month - 1, 1) / DAY_MS;

  for (let day = start; ; day += 1) {
    const date = toDate(day);
    if (Number(date.slice(5, 7)) !== month || Number(date.slice(0, 4)) !== year) break;
    editions.push(editionFor(date, solves, at));
  }

  return editions;
}

/**
 * How many blank cells precede the first of the month.
 *
 * The calendar's week starts on Monday — `copy.md`'s weekday heads are
 * `M T W T F S S` — so Sunday is the seventh column, not the first.
 */
export function leadingBlanks(year: number, month: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return (weekday + 6) % 7;
}

/**
 * Whether an edition survives the filters.
 *
 * An empty group means "no constraint" rather than "match nothing", which is
 * what makes an unfiltered archive show everything. Groups are ANDed and the
 * chips within a group are ORed, which is the only reading that makes "Hard"
 * plus "Solved" mean what a player expects.
 */
export function matches(edition: Edition, filters: Filters): boolean {
  const byDifficulty =
    filters.difficulties.length === 0 || filters.difficulties.includes(edition.difficulty);
  const byStatus = filters.statuses.length === 0 || filters.statuses.includes(edition.status);

  return byDifficulty && byStatus;
}

/** Months that hold at least one edition, newest first. */
export function browsableMonths(at: Date = new Date()): { year: number; month: number }[] {
  const first = PUZZLE_EPOCH;
  const last = currentEdition(at);

  const months: { year: number; month: number }[] = [];
  let year = Number(first.slice(0, 4));
  let month = Number(first.slice(5, 7));

  const endYear = Number(last.slice(0, 4));
  const endMonth = Number(last.slice(5, 7));

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months.reverse();
}
