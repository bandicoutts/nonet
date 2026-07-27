import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dailyStatus, practiceInFlight } from '@/lib/home';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

const AT = new Date('2026-07-27T09:00:00.000Z');
const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 1_150_819_893 };

function solve(over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref: DAILY,
    solvedAt: '2026-07-27T09:14:00.000Z',
    localDate: '2026-07-27',
    durationMs: 462_000,
    mistakes: 1,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
    ...over,
  };
}

/**
 * Yesterday's edition. A different seed, because the seed *is* the edition —
 * it is derived from the date, so two editions cannot share one. A fixture
 * that changed only `localDate` would still be describing today's puzzle.
 */
function yesterday(): GuestSolve {
  return solve({
    ref: { kind: 'daily', difficulty: 'hard', seed: 424_242 },
    localDate: '2026-07-26',
    solvedAt: '2026-07-26T09:00:00.000Z',
  });
}

function seedSolves(...solves: GuestSolve[]): void {
  window.localStorage.setItem('nonet:solves', JSON.stringify(solves));
}

/** A board with `placed` of the empty cells filled, saved against `ref`. */
function seedAutosave(ref: PuzzleRef, placed: number, elapsedMs = 90_000): void {
  const grid = Array.from({ length: 81 }, (_, i) => (i < placed ? '5' : '0')).join('');
  window.localStorage.setItem(
    `nonet:autosave:${ref.kind}:${ref.difficulty}:${ref.seed}`,
    JSON.stringify({
      version: 1,
      ref,
      grid,
      notes: new Array(81).fill(0),
      elapsedMs,
      mistakes: 1,
      hintsUsed: 0,
      updatedAt: '2026-07-27T08:00:00.000Z',
    }),
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe('dailyStatus', () => {
  /*
   * First visit is not the same as "today unplayed". The copy differs — a first
   * visit gets the invitation "Solve today's puzzle to start a run" and no
   * streak band, because a band reading zero is a worse greeting than none.
   */
  it('is a first visit when nothing has ever been played', () => {
    expect(dailyStatus(AT).state).toBe('first-visit');
  });

  it('is ready once there is history but today is untouched', () => {
    seedSolves(yesterday());
    expect(dailyStatus(AT).state).toBe('ready');
  });

  it('is in progress when today has a saved board', () => {
    seedAutosave(DAILY, 12);
    const status = dailyStatus(AT);

    expect(status.state).toBe('in-progress');
    expect(status.placed).toBe(12);
    expect(status.elapsedMs).toBe(90_000);
    expect(status.mistakes).toBe(1);
  });

  it('is solved once today is recorded', () => {
    seedSolves(solve());
    const status = dailyStatus(AT);

    expect(status.state).toBe('solved');
    expect(status.solve?.durationMs).toBe(462_000);
  });

  /*
   * Solved beats in progress. A finished puzzle clears its autosave, but a
   * stale save can survive a sync from another device — and offering "resume"
   * on a solved puzzle would let it be replayed for a second set of stats.
   * Same rule the merge applies (NONET-18).
   */
  it('prefers solved over a stale saved board', () => {
    seedSolves(solve());
    seedAutosave(DAILY, 40);
    expect(dailyStatus(AT).state).toBe('solved');
  });

  it('is failed when the board locked and a retry is left', () => {
    window.localStorage.setItem(`nonet:attempt:daily:easy:${DAILY.seed}`, '1');
    expect(dailyStatus(AT).state).toBe('failed');
  });

  /*
   * Not in `copy.md`, which only ever drew the one failed state. There is no
   * third attempt (NONET-17), so the second failure has to say something
   * different — offering "Start again" would be a control that does nothing.
   */
  it('is spent when both attempts are gone', () => {
    window.localStorage.setItem(`nonet:attempt:daily:easy:${DAILY.seed}`, '2');
    expect(dailyStatus(AT).state).toBe('spent');
  });

  /* Solving the retry is still a solve, and it still holds the run. */
  it('is solved even when an attempt was spent getting there', () => {
    window.localStorage.setItem(`nonet:attempt:daily:easy:${DAILY.seed}`, '1');
    seedSolves(solve({ attempt: 2 }));
    expect(dailyStatus(AT).state).toBe('solved');
  });

  it('names the edition it is talking about', () => {
    const status = dailyStatus(AT);

    expect(status.editionDate).toBe('2026-07-27');
    expect(status.number).toBe(208);
    expect(status.difficulty).toBe('easy');
    expect(status.ref).toEqual(DAILY);
  });

  /*
   * The edition turns over at 00:05 UTC, so in the five minutes after midnight
   * Home must still be offering yesterday's puzzle — the same gate the board
   * and the database apply (NONET-17).
   */
  it('still offers yesterday during the five minutes before publication', () => {
    const status = dailyStatus(new Date('2026-07-28T00:02:00.000Z'));
    expect(status.editionDate).toBe('2026-07-27');
  });

  /*
   * A practice board in progress is not the daily. Reading any autosave would
   * put "Resume" on the hero for a puzzle the player was not playing there.
   */
  it('ignores a practice board when deciding the daily', () => {
    seedSolves(yesterday());
    seedAutosave({ kind: 'practice', difficulty: 'hard', seed: 7 }, 20);

    expect(dailyStatus(AT).state).toBe('ready');
  });

  /* Yesterday's unfinished daily is not today's. */
  it('ignores a saved board for a different edition', () => {
    seedSolves(yesterday());
    seedAutosave({ kind: 'daily', difficulty: 'hard', seed: 99 }, 20);

    expect(dailyStatus(AT).state).toBe('ready');
  });
});

describe('practiceInFlight', () => {
  it('is null when there is no practice board', () => {
    expect(practiceInFlight()).toBeNull();
  });

  it('reports the saved practice board', () => {
    seedAutosave({ kind: 'practice', difficulty: 'medium', seed: 12 }, 22, 221_000);
    const board = practiceInFlight();

    expect(board?.ref.difficulty).toBe('medium');
    expect(board?.placed).toBe(22);
    expect(board?.elapsedMs).toBe(221_000);
  });

  it('ignores the daily', () => {
    seedAutosave(DAILY, 30);
    expect(practiceInFlight()).toBeNull();
  });

  /*
   * One practice puzzle at a time. The database enforces this for a signed-in
   * player with a partial unique index, and a guest can accumulate several —
   * so the most recent one is the one the abandon confirm is about.
   */
  it('takes the most recent when a guest has several', () => {
    seedAutosave({ kind: 'practice', difficulty: 'easy', seed: 1 }, 10);
    window.localStorage.setItem(
      'nonet:autosave:practice:hard:2',
      JSON.stringify({
        version: 1,
        ref: { kind: 'practice', difficulty: 'hard', seed: 2 },
        grid: '0'.repeat(81),
        notes: new Array(81).fill(0),
        elapsedMs: 5_000,
        mistakes: 0,
        hintsUsed: 0,
        updatedAt: '2026-07-27T12:00:00.000Z',
      }),
    );

    expect(practiceInFlight()?.ref.difficulty).toBe('hard');
  });
});
