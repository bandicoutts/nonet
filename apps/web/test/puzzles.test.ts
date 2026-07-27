import { afterEach, describe, expect, it } from 'vitest';
import { currentEdition, dailyDifficulty, dailySeed } from '@nonet/engine';
import {
  PRACTICE_BANK_SIZE,
  canRetry,
  currentAttempt,
  dailyRef,
  failedAttempts,
  pickPractice,
  recordFailure,
} from '../src/lib/puzzles';
import { appendSolve } from '../src/lib/storage';
import type { PuzzleRef } from '../src/lib/storage';

afterEach(() => window.localStorage.clear());

describe('the daily a player should see', () => {
  it('is derived from the date, with no network involved', () => {
    const at = new Date('2026-07-30T12:00:00Z');
    const ref = dailyRef(at);

    expect(ref).toEqual({
      kind: 'daily',
      difficulty: dailyDifficulty('2026-07-30'),
      seed: dailySeed('2026-07-30'),
    });
  });

  /**
   * An edition publishes at 00:05 UTC. Between midnight and then, the current
   * puzzle is still yesterday's — asking for today's would be asking for a row
   * the database is correctly refusing to serve.
   */
  it('is still yesterday in the minutes before the publish time', () => {
    const ref = dailyRef(new Date('2026-07-30T00:02:00Z'));
    expect(ref.seed).toBe(dailySeed('2026-07-29'));
    expect(currentEdition(new Date('2026-07-30T00:02:00Z'))).toBe('2026-07-29');
  });
});

describe('picking a practice puzzle', () => {
  it('comes from the band that was asked for', () => {
    expect(pickPractice('expert', [], () => 0).difficulty).toBe('expert');
  });

  it('stays inside the bank', () => {
    for (const r of [0, 0.5, 0.999999]) {
      const seed = pickPractice('easy', [], () => r).seed;
      expect(seed).toBeGreaterThanOrEqual(1);
      expect(seed).toBeLessThanOrEqual(PRACTICE_BANK_SIZE);
    }
  });

  it('does not deal a puzzle the player has already solved', () => {
    // Everything but seed 7 is spent, so 7 is the only thing left to deal.
    const solved = Array.from({ length: PRACTICE_BANK_SIZE }, (_, i) => i + 1).filter(
      (s) => s !== 7,
    );
    expect(pickPractice('medium', solved, () => 0).seed).toBe(7);
    expect(pickPractice('medium', solved, () => 0.999).seed).toBe(7);
  });

  /** A repeat is better than refusing to deal. */
  it('falls back to the whole bank once the band is exhausted', () => {
    const all = Array.from({ length: PRACTICE_BANK_SIZE }, (_, i) => i + 1);
    const ref = pickPractice('hard', all, () => 0);
    expect(ref.seed).toBe(1);
  });

  it('reads what has been solved from stored solves', () => {
    const spent = (seed: number): PuzzleRef => ({ kind: 'practice', difficulty: 'easy', seed });
    for (let seed = 1; seed <= PRACTICE_BANK_SIZE; seed += 1) {
      if (seed === 42) continue;
      appendSolve({
        ref: spent(seed),
        solvedAt: '2026-07-27T10:00:00.000Z',
        localDate: '2026-07-27',
        durationMs: 1,
        mistakes: 0,
        usedHint: false,
        attempt: 1,
        checked: true,
        kind: 'practice',
      });
    }

    expect(pickPractice('easy', undefined, () => 0).seed).toBe(42);
  });

  it('ignores solves from a different band', () => {
    appendSolve({
      ref: { kind: 'practice', difficulty: 'hard', seed: 1 },
      solvedAt: '2026-07-27T10:00:00.000Z',
      localDate: '2026-07-27',
      durationMs: 1,
      mistakes: 0,
      usedHint: false,
      attempt: 1,
      checked: true,
      kind: 'practice',
    });

    expect(pickPractice('easy', undefined, () => 0).seed).toBe(1);
  });
});

/**
 * Three mistakes lock the board; the same puzzle may be retried from scratch
 * once, and there is no third. The stakes are the point, and an unlimited retry
 * is not a stake (GAME-RULES.md).
 */
describe('attempts', () => {
  const ref: PuzzleRef = { kind: 'daily', difficulty: 'hard', seed: 99 };
  const other: PuzzleRef = { kind: 'practice', difficulty: 'easy', seed: 1 };

  it('starts on the first attempt, with a retry available', () => {
    expect(currentAttempt(ref)).toBe(1);
    expect(canRetry(ref)).toBe(true);
  });

  it('moves to the second attempt once a board has locked', () => {
    recordFailure(ref);
    expect(currentAttempt(ref)).toBe(2);
    expect(canRetry(ref)).toBe(true);
  });

  it('offers no third attempt', () => {
    recordFailure(ref);
    recordFailure(ref);
    expect(canRetry(ref)).toBe(false);
    expect(currentAttempt(ref)).toBe(2);
  });

  it('never counts past two, however many times it is called', () => {
    for (let i = 0; i < 5; i += 1) recordFailure(ref);
    expect(failedAttempts(ref)).toBe(2);
  });

  it('is tracked per puzzle, so failing the daily does not spend a practice retry', () => {
    recordFailure(ref);
    expect(currentAttempt(other)).toBe(1);
    expect(canRetry(other)).toBe(true);
  });

  it('treats unreadable storage as a fresh puzzle rather than a spent one', () => {
    window.localStorage.setItem('nonet:attempt:daily:hard:99', 'nonsense');
    expect(currentAttempt(ref)).toBe(1);
  });
});
