import { describe, expect, it } from 'vitest';
import { currentStreak, longestStreak, streakDays } from '../src/lib/streak';
import type { DailySolve } from '../src/lib/streak';

/**
 * Streaks are derived from solves and never stored (ARCHITECTURE.md). A stored
 * counter is a second source of truth that drifts the first time a solve
 * arrives out of order — which is exactly what the sign-in merge does.
 *
 * One implementation serves guest localStorage and signed-in Postgres alike, so
 * a merged run is counted the same way it was before signing in.
 */
const solve = (localDate: string): DailySolve => ({ localDate });

describe('current streak', () => {
  it('is zero with no solves', () => {
    expect(currentStreak([], '2026-07-27')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const solves = [solve('2026-07-25'), solve('2026-07-26'), solve('2026-07-27')];
    expect(currentStreak(solves, '2026-07-27')).toBe(3);
  });

  /**
   * A run is not broken until the day is over. Someone with a 40-day streak who
   * opens the app at breakfast has not lost it because they have not played yet.
   */
  it('survives a day that has not been played yet', () => {
    const solves = [solve('2026-07-25'), solve('2026-07-26')];
    expect(currentStreak(solves, '2026-07-27')).toBe(2);
  });

  it('is broken by a missed day', () => {
    const solves = [solve('2026-07-24'), solve('2026-07-26'), solve('2026-07-27')];
    expect(currentStreak(solves, '2026-07-27')).toBe(2);
  });

  it('is zero once two days have passed unplayed', () => {
    expect(currentStreak([solve('2026-07-25')], '2026-07-27')).toBe(0);
  });

  it('does not care what order the rows arrive in', () => {
    const solves = [solve('2026-07-27'), solve('2026-07-25'), solve('2026-07-26')];
    expect(currentStreak(solves, '2026-07-27')).toBe(3);
  });

  /**
   * Two dailies can share a local date: a player who flies west banks two in one
   * apparent day (NONET-9). That is one day of streak, not two.
   */
  it('counts a day once, however many solves it holds', () => {
    const solves = [solve('2026-07-26'), solve('2026-07-27'), solve('2026-07-27')];
    expect(currentStreak(solves, '2026-07-27')).toBe(2);
  });

  it('crosses a month boundary', () => {
    const solves = [solve('2026-06-29'), solve('2026-06-30'), solve('2026-07-01')];
    expect(currentStreak(solves, '2026-07-01')).toBe(3);
  });

  it('crosses a leap day', () => {
    const solves = [solve('2028-02-28'), solve('2028-02-29'), solve('2028-03-01')];
    expect(currentStreak(solves, '2028-03-01')).toBe(3);
  });

  it('ignores a solve dated in the future rather than counting it', () => {
    const solves = [solve('2026-07-26'), solve('2026-07-27'), solve('2026-07-30')];
    expect(currentStreak(solves, '2026-07-27')).toBe(2);
  });
});

describe('longest streak', () => {
  it('is zero with no solves', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('finds the longest run, not the most recent', () => {
    const solves = [
      solve('2026-07-01'),
      solve('2026-07-02'),
      solve('2026-07-03'),
      solve('2026-07-04'),
      // gap
      solve('2026-07-20'),
      solve('2026-07-21'),
    ];
    expect(longestStreak(solves)).toBe(4);
  });

  it('handles a single solve', () => {
    expect(longestStreak([solve('2026-07-27')])).toBe(1);
  });
});

describe('streak days', () => {
  it('lists the days of the current run, oldest first', () => {
    const solves = [solve('2026-07-27'), solve('2026-07-25'), solve('2026-07-26')];
    expect(streakDays(solves, '2026-07-27')).toEqual(['2026-07-25', '2026-07-26', '2026-07-27']);
  });

  it('is empty when the run is broken', () => {
    expect(streakDays([solve('2026-07-20')], '2026-07-27')).toEqual([]);
  });
});
