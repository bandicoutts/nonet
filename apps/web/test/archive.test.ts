import { describe, expect, it } from 'vitest';
import { dailyDifficulty, dailySeed } from '@nonet/engine';
import {
  NO_FILTERS,
  browsableMonths,
  editionFor,
  leadingBlanks,
  matches,
  monthEditions,
} from '@/lib/archive';
import type { GuestSolve } from '@/lib/storage';

/** The epoch is 2026-07-27, so "today" here is a fortnight in. */
const AT = new Date('2026-08-10T09:00:00.000Z');

function solveOf(date: string, over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    // Derived, not hardcoded: the difficulty of an edition is a property of
    // its date, so a fixture that picks one is describing a puzzle that does
    // not exist.
    ref: { kind: 'daily', difficulty: dailyDifficulty(date), seed: dailySeed(date) },
    solvedAt: `${date}T09:00:00.000Z`,
    localDate: date,
    durationMs: 300_000,
    mistakes: 0,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
    ...over,
  };
}

describe('editionFor', () => {
  it('derives number, difficulty and seed from the date alone', () => {
    const edition = editionFor('2026-07-27', [], AT);

    expect(edition.number).toBe(1);
    expect(edition.ref.seed).toBe(dailySeed('2026-07-27'));
    expect(edition.difficulty).toBe('easy');
  });

  it('marks the current edition as today', () => {
    expect(editionFor('2026-08-10', [], AT).status).toBe('today');
  });

  it('marks a passed, unsolved edition as unplayed', () => {
    expect(editionFor('2026-08-01', [], AT).status).toBe('unplayed');
  });

  it('marks a later edition as future', () => {
    expect(editionFor('2026-08-11', [], AT).status).toBe('future');
  });

  it('marks dates before the first edition as pre-epoch', () => {
    expect(editionFor('2026-07-26', [], AT).status).toBe('pre-epoch');
  });

  it('marks a solved edition as solved, and carries the time', () => {
    const edition = editionFor('2026-08-01', [solveOf('2026-08-01')], AT);

    expect(edition.status).toBe('solved');
    expect(edition.durationMs).toBe(300_000);
  });

  /*
   * Solved outranks today: a player who has finished the current edition should
   * see it as done rather than as an invitation. Same precedence Home applies.
   */
  it('prefers solved over today', () => {
    expect(editionFor('2026-08-10', [solveOf('2026-08-10')], AT).status).toBe('solved');
  });

  /* Matching is by seed, so a solve of a *different* edition does not count. */
  it('does not credit a solve of another edition', () => {
    expect(editionFor('2026-08-01', [solveOf('2026-08-02')], AT).status).toBe('unplayed');
  });

  it('has no time for an edition never solved', () => {
    expect(editionFor('2026-08-01', [], AT).durationMs).toBeNull();
  });
});

describe('monthEditions', () => {
  it('covers every day of the month', () => {
    expect(monthEditions(2026, 8, [], AT)).toHaveLength(31);
  });

  it('handles a short month', () => {
    expect(monthEditions(2026, 2, [], AT)).toHaveLength(28);
  });

  it('handles a leap February', () => {
    expect(monthEditions(2024, 2, [], AT)).toHaveLength(29);
  });

  it('numbers editions consecutively', () => {
    const august = monthEditions(2026, 8, [], AT);
    expect(august[0]?.number).toBe(6);
    expect(august[1]?.number).toBe(7);
  });
});

describe('leadingBlanks', () => {
  /* The week starts on Monday — copy.md's heads are M T W T F S S. */
  it('is none when the first falls on a Monday', () => {
    // 2026-06-01 is a Monday.
    expect(leadingBlanks(2026, 6)).toBe(0);
  });

  it('is six when the first falls on a Sunday', () => {
    // 2026-02-01 is a Sunday, so it belongs in the seventh column.
    expect(leadingBlanks(2026, 2)).toBe(6);
  });

  it('places a Saturday first in the sixth column', () => {
    // 2026-08-01 is a Saturday.
    expect(leadingBlanks(2026, 8)).toBe(5);
  });
});

describe('matches', () => {
  const hardSolved = editionFor('2026-08-01', [solveOf('2026-08-01')], AT);

  it('passes everything when nothing is filtered', () => {
    expect(matches(hardSolved, NO_FILTERS)).toBe(true);
  });

  it('filters by difficulty', () => {
    expect(matches(hardSolved, { ...NO_FILTERS, difficulties: [hardSolved.difficulty] })).toBe(true);
    expect(matches(hardSolved, { ...NO_FILTERS, difficulties: ['expert'] })).toBe(
      hardSolved.difficulty === 'expert',
    );
  });

  it('filters by status', () => {
    expect(matches(hardSolved, { ...NO_FILTERS, statuses: ['solved'] })).toBe(true);
    expect(matches(hardSolved, { ...NO_FILTERS, statuses: ['unplayed'] })).toBe(false);
  });

  /*
   * Groups are ANDed and chips within a group are ORed — the only reading under
   * which "Hard" plus "Solved" means a solved hard puzzle rather than anything
   * that is either.
   */
  it('ands the groups together', () => {
    expect(
      matches(hardSolved, { difficulties: [hardSolved.difficulty], statuses: ['unplayed'] }),
    ).toBe(false);
  });

  it('ors the chips within a group', () => {
    expect(matches(hardSolved, { ...NO_FILTERS, statuses: ['solved', 'unplayed'] })).toBe(true);
  });
});

describe('browsableMonths', () => {
  it('starts at the epoch and ends at the current edition', () => {
    const months = browsableMonths(AT);

    expect(months[0]).toEqual({ year: 2026, month: 8 });
    expect(months.at(-1)).toEqual({ year: 2026, month: 7 });
  });

  it('is a single month on the first day', () => {
    expect(browsableMonths(new Date('2026-07-27T09:00:00.000Z'))).toEqual([
      { year: 2026, month: 7 },
    ]);
  });

  it('spans a year boundary', () => {
    const months = browsableMonths(new Date('2027-02-03T09:00:00.000Z'));

    expect(months[0]).toEqual({ year: 2027, month: 2 });
    expect(months).toHaveLength(8);
  });
});
