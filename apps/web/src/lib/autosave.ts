/**
 * Turning a live session into a saved record and back.
 *
 * Kept apart from both the engine and the component: the engine does not know
 * about storage, the component does not decide what a save means, and the two
 * directions belong next to each other so a field cannot be added to one and
 * forgotten in the other.
 */
import { formatGrid, parseGrid, restoreSession } from '@nonet/engine';
import type { CandidateMask, Notes, SessionState } from '@nonet/engine';
import { readAutosave, writeAutosave } from './storage';
import type { AutosaveRecord, PuzzleRef } from './storage';

/**
 * The timer is not part of the session — it lives above the board, because
 * pausing is not a board rule — so it is passed in rather than read off the
 * state.
 */
export function toRecord(
  ref: PuzzleRef,
  session: SessionState,
  elapsedMs: number,
  at: Date = new Date(),
): AutosaveRecord {
  return {
    version: 1,
    ref,
    // Zeros, not dots: this record is the `autosaves` row's shape, and that
    // column is constrained to digits.
    grid: formatGrid(session.grid, '0'),
    notes: [...session.notes],
    elapsedMs,
    mistakes: session.mistakes,
    hintsUsed: session.hintsUsed,
    updatedAt: at.toISOString(),
    // Deliberately not `past`/`future`. The undo stack is a full grid-and-notes
    // snapshot per action; persisting it would grow this payload without bound
    // on a write that happens every keystroke (NONET-9).
  };
}

export interface Resumed {
  readonly session: SessionState;
  readonly elapsedMs: number;
}

/**
 * Resume a puzzle, or don't.
 *
 * Returns null for no save, an unreadable one, or one the engine refuses —
 * whereupon the caller simply keeps the fresh board it already has. A guest's
 * storage is editable by hand and can carry a record written by an older
 * version, and neither is a reason to show them a broken puzzle.
 */
export function resume(ref: PuzzleRef, fresh: SessionState): Resumed | null {
  const saved = readAutosave(ref);
  if (saved === null) return null;

  try {
    const session = restoreSession({
      givens: fresh.givens,
      solution: fresh.solution,
      mode: fresh.mode,
      checking: fresh.checking,
      // Carried explicitly. A play setting the restore forgets is one that
      // silently stops working the moment the player reloads.
      autoAdvance: fresh.autoAdvance,
      grid: parseGrid(saved.grid),
      notes: saved.notes as readonly CandidateMask[] as Notes,
      mistakes: saved.mistakes,
      hintsUsed: saved.hintsUsed,
    });

    return { session, elapsedMs: saved.elapsedMs };
  } catch {
    // The engine refused it: the grid contradicts a given, or a tally is out of
    // range. Either way it did not come from playing this puzzle.
    return null;
  }
}

export function save(ref: PuzzleRef, session: SessionState, elapsedMs: number): void {
  writeAutosave(toRecord(ref, session, elapsedMs));
}
