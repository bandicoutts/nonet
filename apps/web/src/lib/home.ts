/**
 * What Home is looking at.
 *
 * Home shows one of six things depending on what the player has already done
 * today, and the difference between them is entirely a question about stored
 * state — so it is answered here, in one place, rather than as a chain of
 * conditionals inside a component. Every branch has a different string in
 * `copy.md` and two of them have different actions, so getting the precedence
 * wrong is a screen that offers the wrong thing rather than one that looks
 * slightly off.
 *
 * Pure with respect to the clock: `at` is injected, because "which edition"
 * turns over at 00:05 UTC and that boundary is exactly what needs testing.
 */
import { currentEdition, puzzleNumber } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';
import { dailyRef, failedAttempts } from './puzzles';
import { listAutosaves, readAutosave, readSolves } from './storage';
import type { AutosaveRecord, GuestSolve, PuzzleRef } from './storage';

/**
 * `first-visit` is deliberately not the same as `ready`.
 *
 * A player with no history gets an invitation and **no streak band**, because
 * a band reading zero is a worse greeting than no band at all — the product's
 * whole streak model rests on not overstating things (NONET-16).
 *
 * `spent` is not in `copy.md`, which only ever drew one failed state. There is
 * no third attempt (NONET-17), so a second failure has to say something
 * different: offering "Start again" there would be a control that does nothing.
 */
export type DailyState =
  | 'first-visit'
  | 'ready'
  | 'in-progress'
  | 'solved'
  | 'failed'
  | 'spent';

export interface DailyStatus {
  readonly state: DailyState;
  readonly ref: PuzzleRef;
  readonly editionDate: string;
  readonly number: number;
  readonly difficulty: Difficulty;
  /** In progress only. */
  readonly placed?: number;
  readonly mistakes?: number;
  readonly elapsedMs?: number;
  /** Solved only. */
  readonly solve?: GuestSolve;
}

export interface InFlightBoard {
  readonly ref: PuzzleRef;
  readonly placed: number;
  readonly elapsedMs: number;
}

/** How many cells hold a digit. The record stores `0` for empty. */
function placedIn(record: AutosaveRecord): number {
  let placed = 0;
  for (const cell of record.grid) {
    if (cell !== '0') placed += 1;
  }
  return placed;
}

/**
 * Which state today's daily is in.
 *
 * Precedence matters and is stated rather than implied. **Solved wins over a
 * saved board**: finishing clears the autosave, but a stale one can survive a
 * sync from another device, and offering "resume" on a solved puzzle would let
 * it be replayed for a second set of stats. That is the same rule the merge
 * applies (NONET-18), and it has to agree.
 *
 * A failed board also clears its autosave, so `failed` sits above `in-progress`
 * for the same reason.
 */
export function dailyStatus(at: Date = new Date()): DailyStatus {
  const ref = dailyRef(at);
  const editionDate = currentEdition(at);

  const identity = {
    ref,
    editionDate,
    number: puzzleNumber(editionDate),
    difficulty: ref.difficulty,
  } as const;

  const solves = readSolves();
  const solve = solves.find(
    (s) =>
      s.ref.kind === 'daily' && s.ref.difficulty === ref.difficulty && s.ref.seed === ref.seed,
  );

  if (solve !== undefined) return { ...identity, state: 'solved', solve };

  // Spent the moment the third mistake lands, not when the retry is taken
  // (NONET-17) — so this is read even though no `solves` row exists.
  const failed = failedAttempts(ref);
  if (failed >= 2) return { ...identity, state: 'spent' };
  if (failed === 1) return { ...identity, state: 'failed' };

  const saved = readAutosave(ref);
  if (saved !== null) {
    return {
      ...identity,
      state: 'in-progress',
      placed: placedIn(saved),
      mistakes: saved.mistakes,
      elapsedMs: saved.elapsedMs,
    };
  }

  /*
   * A first visit means nothing has ever been played — not merely that today
   * has not been. A player returning after a lapse has a history and should see
   * their streak band, even when it reads zero, because that band is *their*
   * record rather than a greeting.
   */
  const everPlayed = solves.length > 0 || listAutosaves().length > 0;
  return { ...identity, state: everPlayed ? 'ready' : 'first-visit' };
}

/**
 * The practice board the player has open, if any.
 *
 * One at a time. The database enforces that for a signed-in player with a
 * partial unique index and a guest can accumulate several, so the most recently
 * touched one is the one the abandon confirm is about — `listAutosaves` already
 * returns them newest first.
 */
export function practiceInFlight(): InFlightBoard | null {
  const record = listAutosaves().find((r) => r.ref.kind === 'practice');
  if (record === undefined) return null;

  return {
    ref: record.ref,
    placed: placedIn(record),
    elapsedMs: record.elapsedMs,
  };
}
