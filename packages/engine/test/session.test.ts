import { describe, expect, test } from 'vitest';
import { digitsOf } from '../src/candidates.ts';
import { getCell, parseGrid } from '../src/grid.ts';
import { MAX_HINTS, hintNeedsConfirmation } from '../src/rules/hints.ts';
import { notesAt } from '../src/rules/notes.ts';
import { apply, createSession } from '../src/rules/session.ts';
import type { SessionOptions, SessionState } from '../src/rules/session.ts';
import type { CellIndex, Digit } from '../src/types.ts';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION } from './fixtures.ts';

function newSession(overrides: Partial<SessionOptions> = {}): SessionState {
  return createSession({
    givens: parseGrid(CLASSIC_PUZZLE),
    solution: parseGrid(CLASSIC_SOLUTION),
    ...overrides,
  });
}

/** Row 0 of CLASSIC_PUZZLE is `53..7....`, so these cells start empty. */
const OPEN_CELLS: readonly CellIndex[] = [2, 3, 5, 6, 7, 8];
const EMPTY_CELL: CellIndex = 2;
const CORRECT_DIGIT = Number(CLASSIC_SOLUTION[EMPTY_CELL]) as Digit;
const WRONG_DIGIT = ((CORRECT_DIGIT % 9) + 1) as Digit;

/** A digit that is definitely not the one belonging in `cell`. */
function wrongFor(cell: CellIndex): Digit {
  return ((Number(CLASSIC_SOLUTION[cell]) % 9) + 1) as Digit;
}

/** Spend all three lives on cells that are actually editable. */
function lockBoard(state: SessionState): SessionState {
  return [2, 3, 5].reduce(
    (current, cell) => apply(current, { type: 'placeDigit', cell, digit: wrongFor(cell) }),
    state,
  );
}

describe('createSession', () => {
  test('starts on the givens with nothing spent', () => {
    const state = newSession();
    expect(state.mistakes).toBe(0);
    expect(state.hintsUsed).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  test('defaults to cell-first, the mode the design ships', () => {
    expect(newSession().mode).toBe('cellFirst');
  });
});

/**
 * Selecting what is already selected.
 *
 * The board dispatches this on every arrow press — the key moves the selection,
 * the focus follows it, and the newly focused cell reports a selection that is
 * already true. Returning a new object for that made a no-op look like a change
 * to everything downstream, including the autosave.
 */
describe('selectCell', () => {
  test('returns the same state when the cell is already selected', () => {
    const state = apply(newSession(), { type: 'selectCell', cell: 2 });
    const again = apply(state, { type: 'selectCell', cell: 2 });

    expect(again).toBe(state);
  });

  test('returns the same state when clearing an already-clear selection', () => {
    const state = newSession();
    expect(state.selected).toBeNull();

    expect(apply(state, { type: 'selectCell', cell: null })).toBe(state);
  });

  test('still moves the selection when the cell is a different one', () => {
    const state = apply(newSession(), { type: 'selectCell', cell: 2 });
    const moved = apply(state, { type: 'selectCell', cell: 3 });

    expect(moved).not.toBe(state);
    expect(moved.selected).toBe(3);
  });

  test('still clears a selection that was set', () => {
    const state = apply(newSession(), { type: 'selectCell', cell: 2 });
    const cleared = apply(state, { type: 'selectCell', cell: null });

    expect(cleared).not.toBe(state);
    expect(cleared.selected).toBeNull();
  });

  test('changes nothing else about the session', () => {
    const state = apply(newSession(), { type: 'selectCell', cell: 2 });
    const again = apply(state, { type: 'selectCell', cell: 2 });

    // Selection is not an undoable move, so a repeat must not have quietly
    // become one.
    expect(again.canUndo).toBe(state.canUndo);
    expect(again.past).toBe(state.past);
    expect(again.grid).toBe(state.grid);
  });
});

describe('placing digits', () => {
  test('writes a correct digit and counts no mistake', () => {
    const state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(CORRECT_DIGIT);
    expect(state.mistakes).toBe(0);
  });

  test('writes a wrong digit and counts a mistake', () => {
    const state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: WRONG_DIGIT });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(WRONG_DIGIT);
    expect(state.mistakes).toBe(1);
  });

  test('givens are inert', () => {
    const state = apply(newSession(), { type: 'placeDigit', cell: 0, digit: 1 });
    expect(getCell(state.grid, 0)).toBe(5);
    expect(state.mistakes).toBe(0);
  });

  test('placing a digit clears it from the notes of its peers', () => {
    let state = newSession();
    state = apply(state, { type: 'toggleNote', cell: 1, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    expect(digitsOf(notesAt(state.notes, 1))).toEqual([]);
  });

  test('three mistakes lock the board and further input is refused', () => {
    const state = lockBoard(newSession());

    expect(state.mistakes).toBe(3);
    expect(state.status).toBe('failed');

    const after = apply(state, { type: 'placeDigit', cell: 6, digit: 1 });
    expect(getCell(after.grid, 6)).toBe(0);
  });

  test('with checking off nothing is flagged and nothing is tallied', () => {
    const state = apply(newSession({ checking: false }), {
      type: 'placeDigit',
      cell: EMPTY_CELL,
      digit: WRONG_DIGIT,
    });
    expect(state.mistakes).toBe(0);
    expect(state.status).toBe('playing');
  });
});

describe('digit-first containment through the session', () => {
  test('repeated wrong taps of one loaded digit cost a single mistake', () => {
    let state = newSession({ mode: 'digitFirst' });
    state = apply(state, { type: 'loadDigit', digit: WRONG_DIGIT });

    for (const cell of OPEN_CELLS) {
      state = apply(state, { type: 'placeDigit', cell, digit: WRONG_DIGIT });
    }

    expect(state.mistakes).toBe(1);
    expect(state.status).toBe('playing');
  });

  test('correcting the error re-arms the charge for that digit', () => {
    let state = newSession({ mode: 'digitFirst' });
    state = apply(state, { type: 'loadDigit', digit: WRONG_DIGIT });
    state = apply(state, { type: 'placeDigit', cell: 2, digit: WRONG_DIGIT });
    expect(state.mistakes).toBe(1);

    state = apply(state, { type: 'erase', cell: 2 });
    state = apply(state, { type: 'placeDigit', cell: 3, digit: WRONG_DIGIT });
    expect(state.mistakes).toBe(2);
  });
});

describe('loading ERASE in digit-first', () => {
  test('ERASE loads like a digit', () => {
    const state = apply(newSession({ mode: 'digitFirst' }), { type: 'loadDigit', digit: 'erase' });
    expect(state.loadedDigit).toBe('erase');
  });

  test('loading ERASE ends containment, as changing digit does', () => {
    let state = newSession({ mode: 'digitFirst' });
    state = apply(state, { type: 'loadDigit', digit: WRONG_DIGIT });
    state = apply(state, { type: 'placeDigit', cell: 2, digit: WRONG_DIGIT });
    expect(state.mistakes).toBe(1);

    state = apply(state, { type: 'loadDigit', digit: 'erase' });
    state = apply(state, { type: 'loadDigit', digit: WRONG_DIGIT });
    state = apply(state, { type: 'placeDigit', cell: 3, digit: WRONG_DIGIT });
    expect(state.mistakes).toBe(2);
  });

  test('clearing the load with null still works', () => {
    let state = apply(newSession({ mode: 'digitFirst' }), { type: 'loadDigit', digit: 5 });
    state = apply(state, { type: 'loadDigit', digit: null });
    expect(state.loadedDigit).toBeNull();
  });
});

describe('erase', () => {
  test('clears an entry when there is one', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'erase', cell: EMPTY_CELL });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(0);
  });

  test('clears notes when there is no entry', () => {
    let state = apply(newSession(), { type: 'toggleNote', cell: EMPTY_CELL, digit: 4 });
    state = apply(state, { type: 'erase', cell: EMPTY_CELL });
    expect(notesAt(state.notes, EMPTY_CELL)).toBe(0);
  });

  test('leaves givens alone', () => {
    const state = apply(newSession(), { type: 'erase', cell: 0 });
    expect(getCell(state.grid, 0)).toBe(5);
  });
});

describe('undo and redo', () => {
  test('undo takes back the last entry', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'undo' });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(0);
  });

  test('redo puts it back', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'undo' });
    state = apply(state, { type: 'redo' });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(CORRECT_DIGIT);
  });

  test('undo covers notes too', () => {
    let state = apply(newSession(), { type: 'toggleNote', cell: EMPTY_CELL, digit: 4 });
    state = apply(state, { type: 'undo' });
    expect(notesAt(state.notes, EMPTY_CELL)).toBe(0);
  });

  test('undo never uncounts a mistake', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: WRONG_DIGIT });
    expect(state.mistakes).toBe(1);

    state = apply(state, { type: 'undo' });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(0);
    expect(state.mistakes).toBe(1);
  });

  test('redo never counts a mistake twice', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: WRONG_DIGIT });
    state = apply(state, { type: 'undo' });
    state = apply(state, { type: 'redo' });
    expect(state.mistakes).toBe(1);
  });

  test('a locked board stays locked through undo', () => {
    const state = apply(lockBoard(newSession()), { type: 'undo' });
    expect(state.mistakes).toBe(3);
    expect(state.status).toBe('failed');
  });

  test('undo does nothing when there is nothing to undo', () => {
    const state = newSession();
    expect(apply(state, { type: 'undo' }).grid).toEqual(state.grid);
  });

  test('a fresh entry clears the redo stack', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: 2, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'undo' });
    state = apply(state, { type: 'placeDigit', cell: 3, digit: 4 });
    expect(state.canRedo).toBe(false);
  });
});

/**
 * Placing the digit a cell already holds.
 *
 * It changes nothing, so it is nothing to undo — but it used to go on the stack
 * regardless, and the player then spent an undo watching the board not move.
 */
describe('re-placing a digit that is already there', () => {
  test('undo goes back to before the original placement, not to an identical board', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });

    state = apply(state, { type: 'undo' });

    // One undo, all the way back to empty. Before this, the first undo landed
    // on a board identical to the one it started from.
    expect(getCell(state.grid, EMPTY_CELL)).toBe(0);
  });

  test('does not grow the undo stack', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    const depth = state.past.length;

    state = apply(state, { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });

    expect(state.past.length).toBe(depth);
  });

  test('leaves the grid and notes by reference, so nothing downstream sees a change', () => {
    const state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    const again = apply(state, { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });

    expect(again.grid).toBe(state.grid);
    expect(again.notes).toBe(state.notes);
  });

  /**
   * A repeat that achieved nothing must not destroy a redo the player can still
   * use — `commit` clearing `future` was the other half of this bug.
   */
  test('keeps a redo that is still legitimately available', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: 2, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'placeDigit', cell: 3, digit: wrongFor(3) });
    state = apply(state, { type: 'undo' });
    expect(state.canRedo).toBe(true);

    // Cell 2 still holds what it was given, so this is the redundant case.
    state = apply(state, { type: 'placeDigit', cell: 2, digit: CORRECT_DIGIT });

    expect(state.canRedo).toBe(true);
    expect(getCell(apply(state, { type: 'redo' }).grid, 3)).toBe(wrongFor(3));
  });

  test('still auto-advances, because that is where the cursor belongs', () => {
    let state = apply(newSession({ autoAdvance: true }), { type: 'selectCell', cell: 2 });
    state = apply(state, { type: 'placeDigit', cell: 2, digit: CORRECT_DIGIT });
    const landed = state.selected;

    state = apply(state, { type: 'selectCell', cell: 2 });
    state = apply(state, { type: 'placeDigit', cell: 2, digit: CORRECT_DIGIT });

    expect(state.selected).toBe(landed);
  });

  /**
   * The tally and the undo stack answer to different rules, and this is where
   * they meet.
   *
   * Written when the undo fix landed to pin the tally it deliberately did not
   * touch, and updated when containment extended to cell-first (NONET-39) —
   * which is exactly the change it was watching for. Repeating one wrong digit
   * in one cell is now one life *and* one undo entry: one misconception, one
   * charge, one thing to take back.
   */
  test('costs one life and one undo entry, however many times it is repeated', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: WRONG_DIGIT });
    expect(state.mistakes).toBe(1);
    expect(state.past.length).toBe(1);

    for (let i = 0; i < 4; i += 1) {
      state = apply(state, { type: 'placeDigit', cell: EMPTY_CELL, digit: WRONG_DIGIT });
    }

    expect(state.mistakes).toBe(1);
    expect(state.past.length).toBe(1);
    expect(state.status).toBe('playing');
  });

  /**
   * The stakes are unchanged: three misconceptions still end the board. What
   * has gone is only the charge for repeating one of them.
   */
  test('three distinct wrong digits still lock the board', () => {
    const state = lockBoard(newSession());

    expect(state.mistakes).toBe(3);
    expect(state.status).toBe('failed');
  });
});

describe('hints', () => {
  test('the first hint confirms, later ones do not', () => {
    const state = newSession();
    expect(hintNeedsConfirmation(state)).toBe(true);

    const after = apply(state, { type: 'hint' });
    expect(hintNeedsConfirmation(after)).toBe(false);
  });

  test('fills the selected cell with the correct digit', () => {
    let state = apply(newSession(), { type: 'selectCell', cell: EMPTY_CELL });
    state = apply(state, { type: 'hint' });
    expect(getCell(state.grid, EMPTY_CELL)).toBe(CORRECT_DIGIT);
    expect(state.hintsUsed).toBe(1);
  });

  test('fills the easiest unfilled cell when nothing is selected', () => {
    const state = apply(newSession(), { type: 'hint' });
    const filled = state.hintedCells[0];
    expect(filled).toBeDefined();
    expect(getCell(state.grid, filled ?? 0)).toBe(Number(CLASSIC_SOLUTION[filled ?? 0]));
  });

  test('never costs a mistake', () => {
    const state = apply(newSession(), { type: 'hint' });
    expect(state.mistakes).toBe(0);
  });

  test('stops at three per puzzle', () => {
    let state = newSession();
    for (let i = 0; i < 5; i += 1) state = apply(state, { type: 'hint' });
    expect(state.hintsUsed).toBe(MAX_HINTS);
  });

  test('undo never restores a spent hint', () => {
    let state = apply(newSession(), { type: 'placeDigit', cell: EMPTY_CELL, digit: CORRECT_DIGIT });
    state = apply(state, { type: 'hint' });

    const hinted = state.hintedCells[0];
    expect(hinted).toBeDefined();
    const hintedDigit = getCell(state.grid, hinted ?? 0);

    state = apply(state, { type: 'undo' });
    state = apply(state, { type: 'undo' });

    expect(getCell(state.grid, hinted ?? 0)).toBe(hintedDigit);
    expect(state.hintsUsed).toBe(1);
  });

  test('a hint marks the solve assisted', () => {
    expect(newSession().assisted).toBe(false);
    expect(apply(newSession(), { type: 'hint' }).assisted).toBe(true);
  });
});

describe('completion', () => {
  test('filling the last cell correctly solves the puzzle', () => {
    let state = newSession();
    for (let cell = 0; cell < 81; cell += 1) {
      if (getCell(state.grid, cell) !== 0) continue;
      state = apply(state, {
        type: 'placeDigit',
        cell,
        digit: Number(CLASSIC_SOLUTION[cell]) as Digit,
      });
    }
    expect(state.status).toBe('solved');
  });
});

/*
 * Auto-advance.
 *
 * A play rule, not React state (NONET-8): where the selection lands after a
 * placement is part of how the board plays, and reimplementing it in a
 * component is exactly the split the engine exists to prevent.
 */
describe('auto-advance', () => {
  test('does not move the selection when it is off', () => {
    const state = apply(newSession(), { type: 'selectCell', cell: 2 });
    const after = apply(state, { type: 'placeDigit', cell: 2, digit: 4 });

    expect(after.selected).toBe(2);
  });

  test('moves to the next empty cell in reading order', () => {
    const state = apply(newSession({ autoAdvance: true }), { type: 'selectCell', cell: 2 });
    const after = apply(state, { type: 'placeDigit', cell: 2, digit: 4 });

    // Row 0 is `53..7....`, so cell 3 is the next empty one.
    expect(after.selected).toBe(3);
  });

  /* It skips what is already filled, givens included. */
  test('skips filled cells', () => {
    const state = apply(newSession({ autoAdvance: true }), { type: 'selectCell', cell: 3 });
    const after = apply(state, { type: 'placeDigit', cell: 3, digit: 6 });

    // Cell 4 is a given (7), so the next empty is 5.
    expect(after.selected).toBe(5);
  });

  /*
   * Cell-first only, which the Settings copy states. In digit-first the digit
   * stays loaded and the player taps every cell that takes it — advancing the
   * selection would fight the gesture rather than help it.
   */
  test('does nothing in digit-first', () => {
    const state = apply(newSession({ autoAdvance: true, mode: 'digitFirst' }), {
      type: 'selectCell',
      cell: 2,
    });
    const after = apply(state, { type: 'placeDigit', cell: 2, digit: 4 });

    expect(after.selected).toBe(2);
  });

  /*
   * A wrong digit keeps the selection. The player has to fix it, and moving
   * them off the cell they just got wrong is the opposite of helpful.
   */
  test('stays put on a wrong placement', () => {
    const state = apply(newSession({ autoAdvance: true }), { type: 'selectCell', cell: 2 });
    const after = apply(state, { type: 'placeDigit', cell: 2, digit: 9 });

    expect(after.selected).toBe(2);
  });

  /* Wraps to the start rather than stopping at the end of the grid. */
  test('wraps around the end of the grid', () => {
    // 78 is the last *empty* cell — 79 and 80 are givens — so the next one is
    // back at the top of the grid.
    let state = apply(newSession({ autoAdvance: true }), { type: 'selectCell', cell: 78 });
    state = apply(state, { type: 'placeDigit', cell: 78, digit: 1 });

    expect(state.selected).toBe(2);
  });
});
