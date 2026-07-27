import { describe, expect, it } from 'vitest';
import {
  DAILY_RHYTHM,
  currentEdition,
  PUZZLE_EPOCH,
  dailyDifficulty,
  dailySeed,
  formatGrid,
  generatePuzzle,
  puzzleNumber,
} from '../src/index.ts';

/**
 * A daily is defined entirely by its date. Everything here is deterministic and
 * has to stay that way forever: change any of it and every past edition becomes
 * a different puzzle from the one people actually played (NONET-9).
 */
describe('the daily seed', () => {
  it('is the same every time for a given date', () => {
    expect(dailySeed('2026-07-27')).toBe(dailySeed('2026-07-27'));
  });

  /**
   * Captured from the implementation, not derived independently — the point is
   * that they can never change *again*. A refactor that alters the hash fails
   * here rather than silently re-minting the entire archive.
   */
  it('is pinned, so the archive can never be re-minted by accident', () => {
    expect(dailySeed('2026-01-01')).toBe(2_049_302_883);
    expect(dailySeed('2026-07-27')).toBe(1_150_819_893);
  });

  it('differs between adjacent dates', () => {
    expect(dailySeed('2026-07-27')).not.toBe(dailySeed('2026-07-28'));
  });

  it('is a non-negative 32-bit integer, so it survives a bigint column', () => {
    for (const date of ['2026-01-01', '2026-07-27', '2030-12-31']) {
      const seed = dailySeed(date);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });

  it('does not collide across a decade of dates', () => {
    const seeds = new Set<number>();
    const day = new Date(Date.UTC(2026, 0, 1));
    for (let i = 0; i < 3653; i += 1) {
      seeds.add(dailySeed(day.toISOString().slice(0, 10)));
      day.setUTCDate(day.getUTCDate() + 1);
    }
    expect(seeds.size).toBe(3653);
  });

  it('rejects anything that is not an ISO date', () => {
    expect(() => dailySeed('27/07/2026')).toThrow(/ISO/);
    expect(() => dailySeed('2026-13-01')).toThrow(/ISO/);
  });
});

/** Mon Easy · Tue-Wed Medium · Thu-Fri Hard · Sat Expert · Sun Hard. */
describe('the weekly rhythm', () => {
  it.each([
    ['2026-07-27', 'monday', 'easy'],
    ['2026-07-28', 'tuesday', 'medium'],
    ['2026-07-29', 'wednesday', 'medium'],
    ['2026-07-30', 'thursday', 'hard'],
    ['2026-07-31', 'friday', 'hard'],
    ['2026-08-01', 'saturday', 'expert'],
    ['2026-08-02', 'sunday', 'hard'],
  ])('%s is a %s, so it is %s', (date, _day, difficulty) => {
    expect(dailyDifficulty(date)).toBe(difficulty);
  });

  it('reads the weekday in UTC, not the machine timezone', () => {
    // Whatever the runner's timezone, this date is a Monday in UTC.
    expect(dailyDifficulty('2026-07-27')).toBe(DAILY_RHYTHM[1]);
  });

  it('covers all seven days', () => {
    expect(Object.keys(DAILY_RHYTHM)).toHaveLength(7);
  });
});

describe('the puzzle number', () => {
  it('counts days from the epoch, starting at one', () => {
    expect(puzzleNumber(PUZZLE_EPOCH)).toBe(1);
  });

  /*
   * Pinned, not derived.
   *
   * Every other assertion here is a *difference* between two dates, so the
   * whole suite passed unchanged when the epoch moved (NONET-31) — which is the
   * right design for the arithmetic and no guard at all for the constant. The
   * epoch is frozen from launch, because moving it renumbers editions people
   * have already shared, so it is asserted directly and this test failing is
   * the point.
   */
  test('the epoch is frozen at the start of 2026', () => {
    expect(PUZZLE_EPOCH).toBe('2026-01-01');
    expect(puzzleNumber('2026-07-27')).toBe(208);
    expect(puzzleNumber('2026-12-31')).toBe(365);
  });

  it('advances by one a day', () => {
    expect(puzzleNumber('2026-07-28') - puzzleNumber('2026-07-27')).toBe(1);
  });

  /**
   * Days since epoch, not a stored counter. A counter that drifted or skipped a
   * day would shift every subsequent puzzle and stop matching what players
   * actually saw (NONET-9).
   */
  it('is derived, so a gap in the table cannot shift it', () => {
    expect(puzzleNumber('2026-08-27') - puzzleNumber('2026-07-27')).toBe(31);
  });

  it('is unaffected by a daylight-saving boundary', () => {
    // The UK springs forward on 2026-03-29.
    expect(puzzleNumber('2026-03-30') - puzzleNumber('2026-03-28')).toBe(2);
  });
});

/**
 * An edition publishes at 00:05 UTC, so for five minutes after midnight the
 * current puzzle is still yesterday's. This is the client's half of the
 * `published_at <= now()` policy: a client that assumed "today" would ask for a
 * row the database is correctly refusing to serve.
 */
describe('which edition is current', () => {
  it('is yesterday in the minutes before the publish time', () => {
    expect(currentEdition(new Date('2026-07-28T00:00:00Z'))).toBe('2026-07-27');
    expect(currentEdition(new Date('2026-07-28T00:04:59Z'))).toBe('2026-07-27');
  });

  it('turns over exactly at 00:05 UTC', () => {
    expect(currentEdition(new Date('2026-07-28T00:05:00Z'))).toBe('2026-07-28');
  });

  it('is today for the rest of the day', () => {
    expect(currentEdition(new Date('2026-07-28T23:59:59Z'))).toBe('2026-07-28');
  });

  it('does not care what timezone the reader is in', () => {
    // A single instant has one edition, whoever is looking at it.
    expect(currentEdition(new Date('2026-07-28T12:00:00Z'))).toBe('2026-07-28');
  });
});

describe('a daily is reproducible from its date alone', () => {
  it('mints byte-identical puzzles from the same date', () => {
    const date = '2026-07-27';
    const first = generatePuzzle(dailyDifficulty(date), dailySeed(date));
    const second = generatePuzzle(dailyDifficulty(date), dailySeed(date));

    expect(formatGrid(first.givens)).toBe(formatGrid(second.givens));
    expect(formatGrid(first.solution)).toBe(formatGrid(second.solution));
    expect(first.score).toBe(second.score);
  });

  it('lands in the band the rhythm asked for', () => {
    for (const date of ['2026-07-27', '2026-07-30', '2026-08-01']) {
      const puzzle = generatePuzzle(dailyDifficulty(date), dailySeed(date));
      expect(puzzle.difficulty).toBe(dailyDifficulty(date));
    }
  });
});
