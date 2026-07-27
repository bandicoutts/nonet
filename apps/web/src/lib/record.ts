/**
 * The Record page's figures, derived.
 *
 * Nothing here is stored. Streaks, medians and shares are all read off the
 * solve rows every time, for the reason NONET-13 gives: a counter kept
 * alongside the rows is a second source of truth, and it drifts the first time
 * a solve arrives out of order — which is exactly what signing in does.
 *
 * Pure, and given `today` rather than reading the clock, because every window
 * here has an edge worth testing.
 */
import { DIFFICULTIES, PUZZLE_EPOCH } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';
import { currentStreak, longestStreak } from './streak';
import type { GuestSolve } from './storage';

const DAY_MS = 86_400_000;

/** How many days the short window covers, today included. */
export const WINDOW_DAYS = 30;

export interface Window {
  readonly current: number;
  readonly best: number;
  readonly solved: number;
  /** Percentage of *checked* solves with no mistakes, or null if none were. */
  readonly mistakeFree: number | null;
}

export interface BandTimes {
  readonly difficulty: Difficulty;
  readonly solved: number;
  readonly best: number | null;
  readonly median: number | null;
}

export interface PracticeBand {
  readonly difficulty: Difficulty;
  readonly played: number;
  readonly median: number | null;
}

export interface Record {
  readonly hasHistory: boolean;
  readonly allTime: Window;
  readonly lastThirty: Window;
  readonly byDifficulty: readonly BandTimes[];
  readonly practice: readonly PracticeBand[];
  /**
   * Percentage of dailies solved with a hint.
   *
   * `copy.md` asks for "0.4 per puzzle", which is **not derivable**: `usedHint`
   * is a boolean on both the guest record and the `solves` table, so the count
   * per puzzle is not stored anywhere. Migrating the schema for a vanity figure
   * is not worth it; the share of assisted solves says the same thing honestly.
   */
  readonly assistedShare: number | null;
}

function dayNumber(localDate: string): number {
  return Date.parse(`${localDate}T00:00:00Z`) / DAY_MS;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  // Even counts take the mean of the middle two, so a two-solve median is not
  // simply the slower of them.
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? null)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function share(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

function windowOf(dailies: readonly GuestSolve[], today: string): Window {
  /*
   * Only *checked* solves can be mistake-free. A solve played with checking off
   * has no tally at all, so counting it as clean would inflate the figure with
   * runs that were never measured (NONET-1).
   */
  const checked = dailies.filter((s) => s.checked);

  return {
    current: currentStreak(dailies, today),
    best: longestStreak(dailies),
    solved: dailies.length,
    mistakeFree: share(checked.filter((s) => s.mistakes === 0).length, checked.length),
  };
}

export function buildRecord(solves: readonly GuestSolve[], today: string): Record {
  const dailies = solves.filter((s) => s.kind === 'daily');
  const practiceSolves = solves.filter((s) => s.kind === 'practice');

  const cutoff = dayNumber(today) - (WINDOW_DAYS - 1);
  const recent = dailies.filter((s) => dayNumber(s.localDate) >= cutoff);

  return {
    hasHistory: solves.length > 0,
    allTime: windowOf(dailies, today),
    lastThirty: windowOf(recent, today),

    byDifficulty: DIFFICULTIES.map((difficulty) => {
      const times = dailies
        .filter((s) => s.ref.difficulty === difficulty)
        .map((s) => s.durationMs);

      return {
        difficulty,
        solved: times.length,
        best: times.length === 0 ? null : Math.min(...times),
        median: median(times),
      };
    }),

    practice: DIFFICULTIES.map((difficulty) => {
      const times = practiceSolves
        .filter((s) => s.ref.difficulty === difficulty)
        .map((s) => s.durationMs);

      return { difficulty, played: times.length, median: median(times) };
    }),

    assistedShare: share(dailies.filter((s) => s.usedHint).length, dailies.length),
  };
}

/**
 * A day's state in the completion strip.
 *
 * **`failed` is deliberately absent.** Nothing records a failed *day*: attempts
 * are stored per puzzle without a date, and a locked board writes no `solves`
 * row at all, by design (NONET-17). So a past day that was attempted and lost
 * is indistinguishable from one never opened, and the strip says "unplayed"
 * rather than guessing. `copy.md`'s summary counts failures; that would need a
 * schema that records them.
 */
export type DayStatus = 'solved' | 'unplayed' | 'future' | 'pre-epoch';

export interface Day {
  readonly date: string;
  readonly status: DayStatus;
}

/** Every day of a calendar year, with what happened on it. */
export function yearGrid(
  year: number,
  solves: readonly GuestSolve[],
  today: string,
): readonly Day[] {
  const solvedDays = new Set(
    solves.filter((s) => s.kind === 'daily').map((s) => s.localDate),
  );

  const todayNumber = dayNumber(today);
  const epochNumber = dayNumber(PUZZLE_EPOCH);

  const days: Day[] = [];
  const start = Date.UTC(year, 0, 1) / DAY_MS;

  for (let day = start; ; day += 1) {
    const date = new Date(day * DAY_MS).toISOString().slice(0, 10);
    if (Number(date.slice(0, 4)) !== year) break;

    days.push({ date, status: statusOf(date, day) });
  }

  return days;

  function statusOf(date: string, day: number): DayStatus {
    // A future date wins outright: it can only come from a wrong clock or a
    // timezone jump, and the streak ignores it for the same reason (NONET-9).
    if (day > todayNumber) return 'future';

    /*
     * A solve outranks the epoch.
     *
     * Found on screen: the strip read "1 solved" while the stat grid read 22,
     * because every solve predated `PUZZLE_EPOCH` and was drawn as "no edition
     * existed". A recorded solve is evidence that one did — and two figures on
     * the same page contradicting each other is worse than either being
     * slightly wrong.
     */
    if (solvedDays.has(date)) return 'solved';

    // Before the first edition there was no puzzle to miss.
    if (day < epochNumber) return 'pre-epoch';
    return 'unplayed';
  }
}

const ONES = [
  'No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * The headline spells its number: "Forty-one days, unbroken."
 *
 * Only to ninety-nine. Past that the prose stops helping — "One hundred and
 * seventeen days, unbroken" is a mouthful where the figure is the point — so it
 * falls back to digits rather than growing a number-to-words library.
 */
export function spellNumber(n: number): string {
  if (n < 0 || n > 99 || !Number.isInteger(n)) return String(n);
  if (n < 20) return ONES[n] ?? String(n);

  const tens = TENS[Math.floor(n / 10)] ?? '';
  const unit = n % 10;
  return unit === 0 ? tens : `${tens}-${(ONES[unit] ?? '').toLowerCase()}`;
}
