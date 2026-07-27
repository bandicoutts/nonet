import { describe, expect, it } from 'vitest';
import { buildRecord, spellNumber, yearGrid } from '@/lib/record';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 1 };

function solve(over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref: DAILY,
    solvedAt: '2026-07-27T09:00:00.000Z',
    localDate: '2026-07-27',
    durationMs: 300_000,
    mistakes: 0,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
    ...over,
  };
}

/** A run of consecutive dailies ending on the given date. */
function run(days: number, endingOn = '2026-07-27'): GuestSolve[] {
  const end = Date.parse(`${endingOn}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return solve({ localDate: date, solvedAt: `${date}T09:00:00.000Z`, ref: { ...DAILY, seed: i } });
  });
}

describe('buildRecord', () => {
  it('is empty when nothing has been solved', () => {
    const record = buildRecord([], '2026-07-27');

    expect(record.hasHistory).toBe(false);
    expect(record.allTime.current).toBe(0);
    expect(record.allTime.solved).toBe(0);
  });

  it('counts the run, the best and the total', () => {
    const record = buildRecord(run(3), '2026-07-27');

    expect(record.allTime.current).toBe(3);
    expect(record.allTime.best).toBe(3);
    expect(record.allTime.solved).toBe(3);
    expect(record.hasHistory).toBe(true);
  });

  /*
   * The mistake-free share counts only *checked* solves. A solve played with
   * checking off has no tally at all, so counting it as mistake-free would
   * inflate the figure with runs that were never measured (NONET-1).
   */
  it('rates mistake-free over checked solves only', () => {
    const record = buildRecord(
      [
        solve({ mistakes: 0 }),
        solve({ localDate: '2026-07-26', mistakes: 2 }),
        solve({ localDate: '2026-07-25', mistakes: 0, checked: false }),
      ],
      '2026-07-27',
    );

    // One of two checked solves was clean.
    expect(record.allTime.mistakeFree).toBe(50);
  });

  it('has no mistake-free figure when nothing was checked', () => {
    const record = buildRecord([solve({ checked: false })], '2026-07-27');
    expect(record.allTime.mistakeFree).toBeNull();
  });

  /*
   * Practice never touches the streak or the daily figures (GAME-RULES.md), so
   * it is counted separately and never mixed in.
   */
  it('keeps practice out of the daily figures', () => {
    const record = buildRecord(
      [solve(), solve({ kind: 'practice', ref: { kind: 'practice', difficulty: 'hard', seed: 9 } })],
      '2026-07-27',
    );

    expect(record.allTime.solved).toBe(1);
    expect(record.practice.find((b) => b.difficulty === 'hard')?.played).toBe(1);
  });

  it('windows the last thirty days', () => {
    const record = buildRecord(run(40), '2026-07-27');

    expect(record.allTime.solved).toBe(40);
    expect(record.lastThirty.solved).toBe(30);
    // The run itself is unbroken, so both windows see it running.
    expect(record.allTime.current).toBe(40);
  });

  describe('by difficulty', () => {
    it('reports the best and the median per band', () => {
      const record = buildRecord(
        [
          solve({ localDate: '2026-07-25', durationMs: 100_000, ref: { ...DAILY, seed: 1 } }),
          solve({ localDate: '2026-07-26', durationMs: 300_000, ref: { ...DAILY, seed: 2 } }),
          solve({ localDate: '2026-07-27', durationMs: 200_000, ref: { ...DAILY, seed: 3 } }),
        ],
        '2026-07-27',
      );

      const easy = record.byDifficulty.find((b) => b.difficulty === 'easy');
      expect(easy?.best).toBe(100_000);
      expect(easy?.median).toBe(200_000);
      expect(easy?.solved).toBe(3);
    });

    it('takes the mean of the middle two for an even count', () => {
      const record = buildRecord(
        [
          solve({ localDate: '2026-07-26', durationMs: 100_000, ref: { ...DAILY, seed: 1 } }),
          solve({ localDate: '2026-07-27', durationMs: 200_000, ref: { ...DAILY, seed: 2 } }),
        ],
        '2026-07-27',
      );

      expect(record.byDifficulty.find((b) => b.difficulty === 'easy')?.median).toBe(150_000);
    });

    it('reports every band, including ones never played', () => {
      const record = buildRecord([solve()], '2026-07-27');

      expect(record.byDifficulty).toHaveLength(4);
      expect(record.byDifficulty.find((b) => b.difficulty === 'expert')?.median).toBeNull();
    });
  });

  /*
   * `copy.md` gives "Hints used, all time / 0.4 per puzzle". That figure is not
   * derivable: `usedHint` is a boolean on both the guest record and the
   * `solves` table, so the *count* per puzzle is not stored anywhere. The share
   * of assisted solves is the honest equivalent, and it needs no migration.
   */
  it('reports the share of assisted solves rather than a count per puzzle', () => {
    const record = buildRecord(
      [solve({ usedHint: true }), solve({ localDate: '2026-07-26' })],
      '2026-07-27',
    );

    expect(record.assistedShare).toBe(50);
  });
});

describe('yearGrid', () => {
  it('gives a cell for every day of the year', () => {
    expect(yearGrid(2026, [], '2026-07-27')).toHaveLength(365);
  });

  it('counts a leap year', () => {
    expect(yearGrid(2024, [], '2026-07-27')).toHaveLength(366);
  });

  it('marks solved days', () => {
    const grid = yearGrid(2026, [solve()], '2026-07-27');
    expect(grid.find((d) => d.date === '2026-07-27')?.status).toBe('solved');
  });

  it('marks days after today as future', () => {
    const grid = yearGrid(2026, [], '2026-07-27');
    expect(grid.find((d) => d.date === '2026-07-28')?.status).toBe('future');
  });

  /* Before the first edition there was no puzzle to miss. */
  it('marks days before the epoch as pre-epoch', () => {
    const grid = yearGrid(2026, [], '2026-07-27');
    expect(grid.find((d) => d.date === '2026-01-01')?.status).toBe('pre-epoch');
  });

  /*
   * Found on screen: the strip read "1 solved" while the stat grid read 22.
   * A solve is evidence that an edition existed, so it outranks the epoch —
   * otherwise the two figures on the same page contradict each other, which is
   * worse than either being slightly wrong.
   */
  it('marks a solved day as solved even before the epoch', () => {
    const early = solve({ localDate: '2026-07-20' });
    const grid = yearGrid(2026, [early], '2026-07-27');

    expect(grid.find((d) => d.date === '2026-07-20')?.status).toBe('solved');
  });

  /* A future date still wins: it can only come from a wrong clock (NONET-9). */
  it('does not mark a future-dated solve as solved', () => {
    const ahead = solve({ localDate: '2026-08-01' });
    const grid = yearGrid(2026, [ahead], '2026-07-27');

    expect(grid.find((d) => d.date === '2026-08-01')?.status).toBe('future');
  });

  it('marks a lost day as failed', () => {
    const failure = { ref: { kind: 'daily' as const, difficulty: 'easy' as const, seed: 1 }, localDate: '2026-07-26', attempts: 2 };
    const grid = yearGrid(2026, [], '2026-07-27', [failure]);

    expect(grid.find((d) => d.date === '2026-07-26')?.status).toBe('failed');
  });

  /* Solving the retry beats having lost the first attempt. */
  it('prefers solved over failed', () => {
    const failure = { ref: { kind: 'daily' as const, difficulty: 'easy' as const, seed: 1 }, localDate: '2026-07-27', attempts: 1 };
    const grid = yearGrid(2026, [solve()], '2026-07-27', [failure]);

    expect(grid.find((d) => d.date === '2026-07-27')?.status).toBe('solved');
  });

  it('marks a passed, unsolved day as unplayed', () => {
    const grid = yearGrid(2026, [], '2026-07-27');
    // The epoch itself is a real edition, and it has not been solved here.
    expect(grid.find((d) => d.date === '2026-07-27')?.status).toBe('unplayed');
  });
});

describe('spellNumber', () => {
  it.each([
    [0, 'No'],
    [1, 'One'],
    [7, 'Seven'],
    [12, 'Twelve'],
    [21, 'Twenty-one'],
    [40, 'Forty'],
    [41, 'Forty-one'],
    [99, 'Ninety-nine'],
  ])('spells %i', (n, expected) => {
    expect(spellNumber(n)).toBe(expected);
  });

  /* Past a hundred the headline reads better as a figure than as prose. */
  it('gives up gracefully past ninety-nine', () => {
    expect(spellNumber(100)).toBe('100');
  });
});
