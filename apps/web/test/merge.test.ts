import { describe, expect, it } from 'vitest';
import { mergeAutosave, mergeSettings, mergeSolves,
  mergeFailures,
} from '../src/lib/merge';
import type { GuestFailure } from '../src/lib/merge';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
import type { AutosaveRecord, GuestSolve, PuzzleRef } from '../src/lib/storage';

/**
 * The merge is the only place in the product where getting it wrong destroys a
 * player's history rather than just looking wrong, and a design mock cannot
 * express any of it (ARCHITECTURE.md). So it is a pure function over two lists,
 * and every rule below is a test.
 *
 * Server wins for completed solves. Latest wins for one in progress. It reports
 * what happened and never asks.
 */
const daily = (seed: number): PuzzleRef => ({ kind: 'daily', difficulty: 'hard', seed });
const practice = (seed: number): PuzzleRef => ({ kind: 'practice', difficulty: 'easy', seed });

function solve(ref: PuzzleRef, overrides: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref,
    solvedAt: '2026-07-27T10:00:00.000Z',
    localDate: '2026-07-27',
    durationMs: 300_000,
    mistakes: 0,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: ref.kind === 'daily' ? 'daily' : 'practice',
    ...overrides,
  };
}

function autosave(ref: PuzzleRef, updatedAt: string): AutosaveRecord {
  return {
    version: 1,
    ref,
    grid: '0'.repeat(81),
    notes: Array.from({ length: 81 }, () => 0),
    elapsedMs: 60_000,
    mistakes: 0,
    hintsUsed: 0,
    updatedAt,
  };
}

describe('completed solves: the server wins', () => {
  it('uploads a guest solve the server has never seen', () => {
    const result = mergeSolves([solve(daily(1))], []);

    expect(result.toUpload).toHaveLength(1);
    expect(result.merged).toHaveLength(1);
    expect(result.summary.uploaded).toBe(1);
  });

  it('adopts a server solve the guest has never seen', () => {
    const result = mergeSolves([], [solve(daily(1))]);

    expect(result.toUpload).toHaveLength(0);
    expect(result.merged).toHaveLength(1);
    expect(result.summary.adopted).toBe(1);
  });

  /**
   * The rule that gives the merge its name. Two devices, one puzzle, one
   * attempt: the server's row is the one that stands, whatever the guest's says
   * and whichever is faster.
   */
  it('keeps the server row when both have the same puzzle and attempt', () => {
    const guest = solve(daily(1), { durationMs: 60_000, mistakes: 3 });
    const server = solve(daily(1), { durationMs: 400_000, mistakes: 1 });

    const result = mergeSolves([guest], [server]);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.durationMs).toBe(400_000);
    expect(result.toUpload).toHaveLength(0);
    expect(result.summary.superseded).toBe(1);
  });

  it('does not upload a guest run the server already has, even a better one', () => {
    const guest = solve(daily(1), { durationMs: 1_000 });
    const server = solve(daily(1), { durationMs: 999_000 });

    expect(mergeSolves([guest], [server]).toUpload).toHaveLength(0);
  });

  /** A first attempt and a retry are different runs, not a conflict. */
  it('keeps both when the attempts differ', () => {
    const result = mergeSolves([solve(daily(1), { attempt: 2 })], [solve(daily(1), { attempt: 1 })]);

    expect(result.merged).toHaveLength(2);
    expect(result.toUpload).toHaveLength(1);
  });

  it('keeps solves for different puzzles apart', () => {
    const result = mergeSolves([solve(daily(1)), solve(practice(5))], [solve(daily(2))]);

    expect(result.merged).toHaveLength(3);
    expect(result.toUpload).toHaveLength(2);
  });

  it('is stable when run twice — a second sign-in uploads nothing new', () => {
    const first = mergeSolves([solve(daily(1))], [solve(daily(2))]);
    const second = mergeSolves(first.merged, first.merged);

    expect(second.toUpload).toHaveLength(0);
    expect(second.merged).toHaveLength(2);
  });

  it('reports nothing to report when both sides are empty', () => {
    const result = mergeSolves([], []);
    expect(result.summary).toEqual({ uploaded: 0, adopted: 0, superseded: 0 });
  });
});

describe('a puzzle in progress: the latest wins', () => {
  it('keeps the guest board when it is newer', () => {
    const result = mergeAutosave(
      autosave(daily(1), '2026-07-27T12:00:00.000Z'),
      autosave(daily(1), '2026-07-27T09:00:00.000Z'),
      [],
    );

    expect(result.keep).toBe('guest');
    expect(result.upload).toBe(true);
  });

  it('keeps the server board when it is newer', () => {
    const result = mergeAutosave(
      autosave(daily(1), '2026-07-27T09:00:00.000Z'),
      autosave(daily(1), '2026-07-27T12:00:00.000Z'),
      [],
    );

    expect(result.keep).toBe('server');
    expect(result.upload).toBe(false);
  });

  /**
   * A tie has to break somewhere, and it breaks towards the server — the same
   * direction as every other rule here, so there is one thing to remember
   * rather than two.
   */
  it('breaks an exact tie towards the server', () => {
    const at = '2026-07-27T12:00:00.000Z';
    expect(mergeAutosave(autosave(daily(1), at), autosave(daily(1), at), []).keep).toBe('server');
  });

  it('takes whichever exists when only one does', () => {
    expect(mergeAutosave(autosave(daily(1), '2026-07-27T12:00:00.000Z'), null, []).keep).toBe('guest');
    expect(mergeAutosave(null, autosave(daily(1), '2026-07-27T12:00:00.000Z'), []).keep).toBe('server');
    expect(mergeAutosave(null, null, []).keep).toBe('neither');
  });

  /**
   * You cannot be part-way through a puzzle you have finished. A guest board
   * left open on another device is stale the moment the solve lands, and
   * resuming into it would let a finished puzzle be played again for a second
   * set of stats.
   */
  it('discards an in-progress board for a puzzle that is already solved', () => {
    const result = mergeAutosave(
      autosave(daily(1), '2026-07-27T23:00:00.000Z'),
      null,
      [solve(daily(1))],
    );

    expect(result.keep).toBe('neither');
    expect(result.upload).toBe(false);
    expect(result.discardedBecauseSolved).toBe(true);
  });

  it('leaves an in-progress board alone when the solve is for another puzzle', () => {
    const result = mergeAutosave(
      autosave(daily(1), '2026-07-27T23:00:00.000Z'),
      null,
      [solve(daily(2))],
    );

    expect(result.keep).toBe('guest');
  });
});

/**
 * Settings are not a merge in the same sense — there is no honest way to
 * combine two sets of preferences — so the rule is stated rather than inferred.
 */
describe('settings', () => {
  it('take the server profile once there is one', () => {
    const server = { ...DEFAULT_SETTINGS, theme: 'dark' as const, autoAdvance: true };
    expect(mergeSettings({ ...DEFAULT_SETTINGS }, server, false)).toEqual(server);
  });

  /**
   * Except on the very first sign-in, where the profile is nothing but column
   * defaults and the guest's choices are the only real ones in play. Taking the
   * server there would silently reset every setting a player had chosen as a
   * guest — which is exactly the moment they would notice and not know why.
   */
  it('keep the guest choices when the profile is brand new', () => {
    const guest = { ...DEFAULT_SETTINGS, theme: 'light' as const, checking: false };
    expect(mergeSettings(guest, { ...DEFAULT_SETTINGS }, true)).toEqual(guest);
  });
});

/*
 * Failures merge by union, like solves — but they are *amendable*, which solves
 * are not. A player who lost the first attempt on one device and the retry on
 * another has lost the puzzle twice, and the account should say two.
 */
describe('mergeFailures', () => {
  const failure = (seed: number, over: Partial<GuestFailure> = {}): GuestFailure => ({
    ref: { kind: 'daily', difficulty: 'hard', seed },
    localDate: '2026-08-01',
    attempts: 1,
    ...over,
  });

  it('uploads a failure the account has never seen', () => {
    const merged = mergeFailures([failure(1)], []);

    expect(merged.upload).toHaveLength(1);
    expect(merged.upload[0]?.attempts).toBe(1);
  });

  it('uploads nothing when the account already agrees', () => {
    const merged = mergeFailures([failure(1)], [failure(1)]);
    expect(merged.upload).toHaveLength(0);
  });

  /* Two failures of the same puzzle on two devices is two attempts. */
  it('takes the higher attempt count', () => {
    const merged = mergeFailures([failure(1, { attempts: 2 })], [failure(1)]);

    expect(merged.upload).toHaveLength(1);
    expect(merged.upload[0]?.attempts).toBe(2);
  });

  it('does not lower a count the account already holds', () => {
    const merged = mergeFailures([failure(1)], [failure(1, { attempts: 2 })]);
    expect(merged.upload).toHaveLength(0);
  });

  /*
   * The day a puzzle was lost is the day it was *first* lost, whichever side
   * holds it — otherwise a retry on a later device moves the failure to a day
   * the player was not even playing.
   */
  it('keeps the earlier date', () => {
    const merged = mergeFailures(
      [failure(1, { localDate: '2026-08-02', attempts: 2 })],
      [failure(1, { localDate: '2026-08-01' })],
    );

    expect(merged.upload[0]?.localDate).toBe('2026-08-01');
  });

  /* Idempotent, like every other rule here: merging its own output uploads nothing. */
  it('is idempotent', () => {
    const first = mergeFailures([failure(1, { attempts: 2 })], []);
    const second = mergeFailures([failure(1, { attempts: 2 })], first.upload);

    expect(second.upload).toHaveLength(0);
  });

  it('keeps failures for different puzzles apart', () => {
    expect(mergeFailures([failure(1), failure(2)], []).upload).toHaveLength(2);
  });
});
