import { describe, expect, it } from 'vitest';
import { MAX_HINTS, MAX_MISTAKES, apply, createSession, emptyNotes, parseGrid, restoreSession, setNotesAt } from '../src/index';
import type { Grid } from '../src/index';

/**
 * Resuming a puzzle is the engine's job, not the app's.
 *
 * The app has the saved bytes and nothing else; deciding what they mean — is
 * this board finished, is it locked, does a spent hint still count — is rule
 * work, and rule work reimplemented in React is exactly what the split in
 * NONET-8 exists to prevent.
 */
const PUZZLE =
  '53..7....' + '6..195...' + '.98....6.' + '8...6...3' + '4..8.3..1' +
  '7...2...6' + '.6....28.' + '...419..5' + '....8..79';
const SOLUTION =
  '534678912' + '672195348' + '198342567' + '859761423' + '426853791' +
  '713924856' + '961537284' + '287419635' + '345286179';

const givens = parseGrid(PUZZLE);
const solution = parseGrid(SOLUTION);

/** The givens with one correct entry added at cell 2. */
function partial(): Grid {
  const grid = [...givens] as number[];
  grid[2] = 4;
  return grid as unknown as Grid;
}

describe('restoring a session', () => {
  it('brings back the grid and notes exactly', () => {
    const notes = setNotesAt(emptyNotes(), 3, 0b000010010);
    const state = restoreSession({ givens, solution, grid: partial(), notes });

    expect(state.grid[2]).toBe(4);
    expect(state.notes[3]).toBe(0b000010010);
  });

  it('brings back the tally, so a resumed board is not a fresh life', () => {
    const state = restoreSession({ givens, solution, grid: partial(), notes: emptyNotes(), mistakes: 2 });
    expect(state.mistakes).toBe(2);
    expect(state.status).toBe('playing');
  });

  /**
   * The undo stack is deliberately not persisted (NONET-9), so a resumed board
   * starts with no history. Unlimited undo means unlimited within a sitting.
   */
  it('starts with no history, because the stack is never saved', () => {
    const state = restoreSession({ givens, solution, grid: partial(), notes: emptyNotes() });
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.past).toHaveLength(0);
  });

  it('locks a board that was already out of lives', () => {
    const state = restoreSession({
      givens, solution, grid: partial(), notes: emptyNotes(), mistakes: MAX_MISTAKES,
    });
    expect(state.status).toBe('failed');
  });

  it('recognises a board that was already finished', () => {
    const state = restoreSession({ givens, solution, grid: solution, notes: emptyNotes() });
    expect(state.status).toBe('solved');
  });

  /** A hint marks the solve assisted for the rest of the puzzle, reload or not. */
  it('keeps the solve assisted when a hint was spent before the reload', () => {
    const state = restoreSession({
      givens, solution, grid: partial(), notes: emptyNotes(), hintsUsed: 1,
    });
    expect(state.hintsUsed).toBe(1);
    expect(state.assisted).toBe(true);
  });

  it('is not assisted when no hint was spent', () => {
    const state = restoreSession({ givens, solution, grid: partial(), notes: emptyNotes() });
    expect(state.assisted).toBe(false);
  });

  /**
   * Digit-first containment is a within-a-gesture allowance: the digit is
   * loaded, it has already cost a life, and further misplacements are free
   * until the player moves on. Nothing is loaded after a reload, so carrying
   * containment across one would hand out a free mistake.
   */
  it('carries no digit-first containment across a reload', () => {
    const state = restoreSession({ givens, solution, grid: partial(), notes: emptyNotes(), mistakes: 1 });
    expect(state.tracker.containedDigit).toBeNull();
    expect(state.loadedDigit).toBeNull();
  });

  it('resumes into a session the reducer can carry on with', () => {
    let state = restoreSession({ givens, solution, grid: partial(), notes: emptyNotes(), mistakes: 1 });
    state = apply(state, { type: 'placeDigit', cell: 3, digit: 6 });

    expect(state.grid[3]).toBe(6);
    expect(state.canUndo).toBe(true);
    // Still one mistake: placing a correct digit costs nothing, and the
    // restored tally is not reset by the first action.
    expect(state.mistakes).toBe(1);
  });

  it('keeps the settings it was given', () => {
    const state = restoreSession({
      givens, solution, grid: partial(), notes: emptyNotes(), mode: 'digitFirst', checking: false,
    });
    expect(state.mode).toBe('digitFirst');
    expect(state.checking).toBe(false);
  });

  it('matches a fresh session when nothing has been played', () => {
    const restored = restoreSession({ givens, solution, grid: givens, notes: emptyNotes() });
    const fresh = createSession({ givens, solution });
    expect(restored).toEqual(fresh);
  });
});

/**
 * A saved board is bytes from a device we do not control: localStorage is
 * editable, and a sync can deliver a row written by an older version. The
 * engine refuses anything it cannot honour rather than resuming into a state
 * its own rules never allow, and the caller falls back to a fresh puzzle.
 */
describe('refusing a save that cannot be true', () => {
  it('rejects a grid that contradicts the givens', () => {
    const tampered = [...givens] as number[];
    // Cell 0 is a given of 5. A save claiming otherwise did not come from play.
    tampered[0] = 9;
    expect(() =>
      restoreSession({ givens, solution, grid: tampered as unknown as Grid, notes: emptyNotes() }),
    ).toThrow(/given/i);
  });

  it('rejects a grid that is not 81 cells', () => {
    expect(() =>
      restoreSession({ givens, solution, grid: [1, 2, 3] as unknown as Grid, notes: emptyNotes() }),
    ).toThrow(/81/);
  });

  it('rejects more mistakes than a board can hold', () => {
    expect(() =>
      restoreSession({
        givens, solution, grid: partial(), notes: emptyNotes(), mistakes: MAX_MISTAKES + 1,
      }),
    ).toThrow(/mistakes/i);
  });

  it('rejects more hints than a puzzle allows', () => {
    expect(() =>
      restoreSession({
        givens, solution, grid: partial(), notes: emptyNotes(), hintsUsed: MAX_HINTS + 1,
      }),
    ).toThrow(/hints/i);
  });

  it('rejects a negative tally', () => {
    expect(() =>
      restoreSession({ givens, solution, grid: partial(), notes: emptyNotes(), mistakes: -1 }),
    ).toThrow(/mistakes/i);
  });
});
