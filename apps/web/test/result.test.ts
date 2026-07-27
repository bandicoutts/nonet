import { describe, expect, it } from 'vitest';
import {
  buildResult,
  formatCountdown,
  formatDuration,
  isRanked,
  msUntilNextEdition,
  runFor,
  shareText,
  variantOf,
} from '@/lib/result';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'hard', seed: 4242 };

function solve(over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref: DAILY,
    solvedAt: '2026-07-27T09:14:00.000Z',
    localDate: '2026-07-27',
    durationMs: 432_000,
    mistakes: 1,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
    ...over,
  };
}

describe('variantOf', () => {
  it('is standard for a clean first attempt with checking on', () => {
    expect(variantOf(solve())).toBe('standard');
  });

  it('is assisted when a hint was used', () => {
    expect(variantOf(solve({ usedHint: true }))).toBe('assisted');
  });

  it('is second for a retry', () => {
    expect(variantOf(solve({ attempt: 2 }))).toBe('second');
  });

  it('is unchecked when the player played with checking off', () => {
    expect(variantOf(solve({ checked: false }))).toBe('unchecked');
  });

  /*
   * Precedence, and why.
   *
   * All three non-standard variants disqualify a solve from ranking, so when
   * several apply the note has to pick one. Unchecked wins because it is the
   * only one that changes a *second* thing on screen: with no tally there is no
   * honest mistake count, so the stat reads "—" rather than a number. Assisted
   * beats second attempt because a hint is a choice made during this solve,
   * where the attempt is a fact about a board that ended earlier.
   */
  it('prefers unchecked, then assisted, then second attempt', () => {
    expect(variantOf(solve({ checked: false, usedHint: true, attempt: 2 }))).toBe('unchecked');
    expect(variantOf(solve({ usedHint: true, attempt: 2 }))).toBe('assisted');
  });
});

describe('isRanked', () => {
  it('ranks a clean, checked, first-attempt daily', () => {
    expect(isRanked(solve())).toBe(true);
  });

  it.each([
    ['a hint was used', { usedHint: true }],
    ['it was the second attempt', { attempt: 2 as const }],
    ['checking was off', { checked: false }],
  ])('does not rank when %s', (_why, over) => {
    expect(isRanked(solve(over))).toBe(false);
  });

  /*
   * Practice, archive and replay solves are recorded and never ranked
   * (GAME-RULES.md). The percentile compares a player against everyone who
   * played *that day's* puzzle, and there is no such cohort for a puzzle dealt
   * at random or played years late.
   */
  it.each(['practice', 'archive', 'replay'] as const)('does not rank a %s solve', (kind) => {
    expect(isRanked(solve({ kind }))).toBe(false);
  });
});

describe('runFor', () => {
  it('reports the run before and after this solve', () => {
    const history = [
      solve({ localDate: '2026-07-25' }),
      solve({ localDate: '2026-07-26' }),
      solve({ localDate: '2026-07-27' }),
    ];
    expect(runFor(history[2]!, history)).toEqual({ from: 2, to: 3, best: 3 });
  });

  it('opens a run at zero to one on a first ever solve', () => {
    const only = solve();
    expect(runFor(only, [only])).toEqual({ from: 0, to: 1, best: 1 });
  });

  /*
   * A run that had already lapsed restarts rather than resuming. The player
   * last solved four days ago, so nothing carries: 0 -> 1, with the old run
   * surviving only as the best.
   */
  it('restarts a lapsed run, keeping the best', () => {
    const history = [
      solve({ localDate: '2026-07-20' }),
      solve({ localDate: '2026-07-21' }),
      solve({ localDate: '2026-07-22' }),
      solve({ localDate: '2026-07-27' }),
    ];
    expect(runFor(history[3]!, history)).toEqual({ from: 0, to: 1, best: 3 });
  });

  /*
   * Only dailies extend a run. A practice solve on a day with no daily must not
   * make the streak band claim a day that was never earned.
   */
  it('ignores practice and archive solves entirely', () => {
    const history = [
      solve({ localDate: '2026-07-26', kind: 'practice' }),
      solve({ localDate: '2026-07-27', kind: 'practice' }),
    ];
    expect(runFor(history[1]!, history)).toBeNull();
  });

  it('does not count a practice solve towards a daily run', () => {
    const history = [
      solve({ localDate: '2026-07-26', kind: 'practice' }),
      solve({ localDate: '2026-07-27' }),
    ];
    expect(runFor(history[1]!, history)).toEqual({ from: 0, to: 1, best: 1 });
  });

  /*
   * Two solves on one local day are one day of streak (NONET-13). A player who
   * flies west and banks two dailies has not earned two days, and the "from"
   * side must not double-count either.
   */
  it('counts two solves on one local day once', () => {
    const history = [
      solve({ localDate: '2026-07-26' }),
      solve({ localDate: '2026-07-27', solvedAt: '2026-07-27T08:00:00.000Z' }),
      solve({ localDate: '2026-07-27', solvedAt: '2026-07-27T21:00:00.000Z' }),
    ];
    expect(runFor(history[2]!, history)).toEqual({ from: 2, to: 2, best: 2 });
  });

  /*
   * The current solve is withheld from the "before" side, and the caller may
   * hand over an equal-but-not-identical object — `readSolves` parses fresh
   * objects on every call, so a screen that re-reads storage between finding
   * the solve and describing it would otherwise leave it in both sides and
   * report a run that never grew.
   */
  it('withholds an equal solve that is not the same object', () => {
    const history = [solve({ localDate: '2026-07-26' }), solve({ localDate: '2026-07-27' })];
    const copy = JSON.parse(JSON.stringify(history[1])) as GuestSolve;

    expect(runFor(copy, history)).toEqual({ from: 1, to: 2, best: 2 });
  });

  /* Only one occurrence comes out, so the twin on the same day still counts. */
  it('withholds exactly one occurrence', () => {
    const history = [
      solve({ localDate: '2026-07-26' }),
      solve({ localDate: '2026-07-27' }),
      solve({ localDate: '2026-07-27' }),
    ];
    expect(runFor(history[2]!, history)).toEqual({ from: 2, to: 2, best: 2 });
  });
});

describe('formatDuration', () => {
  it('is minutes and seconds, zero-padded', () => {
    expect(formatDuration(432_000)).toBe('07:12');
  });

  it('keeps a sub-minute solve in the same shape', () => {
    expect(formatDuration(9_000)).toBe('00:09');
  });

  it('grows an hours field only when there is one', () => {
    expect(formatDuration(3_600_000 + 432_000)).toBe('1:07:12');
  });
});

describe('formatCountdown', () => {
  it('is hours, minutes and seconds, all padded', () => {
    expect(formatCountdown(51_726_000)).toBe('14:22:06');
  });

  it('floors at zero rather than going negative', () => {
    expect(formatCountdown(-5_000)).toBe('00:00:00');
  });
});

describe('msUntilNextEdition', () => {
  /*
   * An edition publishes at 00:05 UTC, so "next puzzle" is the next 00:05 UTC
   * — not the next midnight. Getting this wrong shows a countdown that hits
   * zero five minutes before the puzzle a player is waiting for exists.
   */
  it('counts to the next 00:05 UTC', () => {
    const at = new Date('2026-07-27T09:43:00.000Z');
    expect(msUntilNextEdition(at)).toBe(
      new Date('2026-07-28T00:05:00.000Z').getTime() - at.getTime(),
    );
  });

  it('counts to today 00:05 during the five minutes after midnight', () => {
    const at = new Date('2026-07-27T00:02:00.000Z');
    expect(msUntilNextEdition(at)).toBe(180_000);
  });
});

describe('shareText', () => {
  /*
   * Three lines, no grid, no spoilers. The mistake count is pluralised, which
   * `copy.md` records as a defect in the prototype rather than as a choice.
   */
  it('is the three specified lines', () => {
    expect(shareText({ number: 1247, difficulty: 'hard', durationMs: 432_000, mistakes: 1, percentile: 22 }))
      .toBe('NONET No. 1247 · Hard\n07:12 · 1 mistake · top 22%\nnonet.app');
  });

  it('pluralises the mistake count', () => {
    const text = shareText({ number: 1, difficulty: 'easy', durationMs: 60_000, mistakes: 2, percentile: 40 });
    expect(text).toContain('2 mistakes');
  });

  it('pluralises zero mistakes', () => {
    const text = shareText({ number: 1, difficulty: 'easy', durationMs: 60_000, mistakes: 0, percentile: 40 });
    expect(text).toContain('0 mistakes');
  });

  /*
   * Two segments the prototype never had to render, because it only ever drew
   * the ranked case. Both are omissions rather than invented strings: an
   * unranked solve has no percentile to state, and an unchecked one has no
   * mistake count that means anything.
   */
  it('drops the percentile when the solve was not ranked', () => {
    const text = shareText({ number: 7, difficulty: 'hard', durationMs: 432_000, mistakes: 1, percentile: null });
    expect(text).toBe('NONET No. 7 · Hard\n07:12 · 1 mistake\nnonet.app');
  });

  it('drops the mistake count when checking was off', () => {
    const text = shareText({ number: 7, difficulty: 'hard', durationMs: 432_000, mistakes: null, percentile: null });
    expect(text).toBe('NONET No. 7 · Hard\n07:12\nnonet.app');
  });

  it('never contains a digit from the grid or the word solution', () => {
    const text = shareText({ number: 1247, difficulty: 'expert', durationMs: 432_000, mistakes: 1, percentile: 22 });
    expect(text.split('\n')).toHaveLength(3);
    expect(text).not.toMatch(/solution/i);
  });
});

describe('buildResult', () => {
  it('describes a standard daily solve', () => {
    const one = solve();
    const result = buildResult(one, [one], new Date('2026-07-27T09:20:00.000Z'));

    expect(result).toMatchObject({
      variant: 'standard',
      ranked: true,
      difficulty: 'hard',
      durationMs: 432_000,
      mistakes: 1,
      editionDate: '2026-07-27',
      number: 208,
      run: { from: 0, to: 1, best: 1 },
    });
  });

  /* With checking off there was no tally, so there is no count to show. */
  it('has no mistake count for an unchecked solve', () => {
    const one = solve({ checked: false });
    expect(buildResult(one, [one], new Date('2026-07-27T09:20:00.000Z')).mistakes).toBeNull();
  });

  it('has no edition number or run for a practice solve', () => {
    const one = solve({ kind: 'practice', ref: { kind: 'practice', difficulty: 'medium', seed: 12 } });
    const result = buildResult(one, [one], new Date('2026-07-27T09:20:00.000Z'));

    expect(result.number).toBeNull();
    expect(result.editionDate).toBeNull();
    expect(result.run).toBeNull();
    expect(result.ranked).toBe(false);
  });
});
