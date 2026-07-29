/**
 * Streaks, derived from solves.
 *
 * Nothing here is stored. A streak counter kept alongside the solves is a
 * second source of truth, and it drifts the first time a solve arrives out of
 * order — which is precisely what signing in does when it merges a guest's
 * history into a server's (ARCHITECTURE.md).
 *
 * This is the single implementation for both sides of that merge: guest rows
 * from localStorage and server rows from Postgres are the same shape by the
 * time they reach it, so a run counts the same before and after signing in.
 *
 * Only dailies belong here. Archive and practice solves record stats but never
 * extend a streak (GAME-RULES.md), so the caller filters.
 */

/** A completed daily. `localDate` is the player's own calendar day, `YYYY-MM-DD`. */
export interface DailySolve {
  readonly localDate: string;
}

const DAY_MS = 86_400_000;

/**
 * Dates are compared as UTC midnights parsed from `YYYY-MM-DD`.
 *
 * The date string already *is* the player's local day — it was recorded from
 * their device at the moment of the solve (NONET-9). Parsing it as UTC is
 * therefore not a timezone assumption; it is the only way to compare two local
 * days without reintroducing one. `new Date('2026-07-27')` is already UTC, but
 * being explicit keeps the next reader from "fixing" it.
 */
function toDayNumber(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / DAY_MS;
}

function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Distinct solved days, ascending. Two solves on one local day are one day. */
function distinctDays(solves: readonly DailySolve[]): number[] {
  return [...new Set(solves.map((s) => toDayNumber(s.localDate)))].sort((a, b) => a - b);
}

/**
 * The run ending today, or yesterday if today has not been played yet.
 *
 * A streak is not broken until the day is over: a player with forty days who
 * opens the app at breakfast still has forty. It breaks only once a whole day
 * has passed unplayed.
 *
 * A solve dated in the future is ignored rather than counted — it can only come
 * from a device clock that is wrong or a timezone jump, and letting it anchor
 * the run would inflate the streak.
 *
 * Exported for the tests; no other module imports it.
 */
export function streakDays(solves: readonly DailySolve[], today: string): string[] {
  const days = distinctDays(solves);
  const cutoff = toDayNumber(today);

  const past = days.filter((day) => day <= cutoff);
  const last = past.at(-1);
  if (last === undefined) return [];

  // Played today, or yesterday and today is still open. Anything older is over.
  if (last < cutoff - 1) return [];

  const run: number[] = [last];
  for (let i = past.length - 2; i >= 0; i -= 1) {
    const day = past[i];
    if (day === undefined || day !== (run[0] ?? 0) - 1) break;
    run.unshift(day);
  }

  return run.map(fromDayNumber);
}

/** How many consecutive days the player has solved the daily, to today. */
export function currentStreak(solves: readonly DailySolve[], today: string): number {
  return streakDays(solves, today).length;
}

/** The longest run the player has ever had. */
export function longestStreak(solves: readonly DailySolve[]): number {
  const days = distinctDays(solves);
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;

  for (let i = 1; i < days.length; i += 1) {
    run = days[i] === (days[i - 1] ?? 0) + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  return best;
}
