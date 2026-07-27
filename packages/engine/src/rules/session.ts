import { getCell, setCell } from '../grid';
import type { CellIndex, Digit, Grid, Notes } from '../types';
import { isSolved } from '../validate';
import { chooseHint, MAX_HINTS } from './hints';
import {
  createMistakeTracker,
  loadDigit as loadDigitInTracker,
  recordWrongPlacement,
  releaseContainment,
} from './mistakes';
import type { InputMode, MistakeTracker } from './mistakes';
import { clearNotesAt, clearPeerNotes, emptyNotes, notesAt, toggleNote } from './notes';

export type SessionStatus = 'playing' | 'solved' | 'failed';

/** What digit-first has on the cursor: a digit, the eraser, or nothing. */
export type Loaded = Digit | 'erase' | null;

/** The part of a session undo can move through. */
interface Snapshot {
  readonly grid: Grid;
  readonly notes: Notes;
}

export interface SessionOptions {
  readonly givens: Grid;
  readonly solution: Grid;
  readonly mode?: InputMode;
  /**
   * Auto-check. On by default; the purist toggle turns it off, and then nothing
   * is flagged and no mistake is tallied.
   */
  readonly checking?: boolean;
}

export interface SessionState {
  readonly givens: Grid;
  readonly solution: Grid;
  readonly grid: Grid;
  readonly notes: Notes;

  readonly mistakes: number;
  readonly hintsUsed: number;
  readonly hintedCells: readonly CellIndex[];
  /** A single hint marks the solve assisted for the rest of the puzzle. */
  readonly assisted: boolean;

  readonly mode: InputMode;
  readonly checking: boolean;
  readonly notesMode: boolean;
  readonly selected: CellIndex | null;
  /**
   * Digit-first: what is currently loaded onto the cursor. `ERASE` loads the
   * same way a digit does, so it is part of the same slot rather than a
   * separate mode (GAME-RULES.md).
   */
  readonly loadedDigit: Loaded;

  readonly status: SessionStatus;
  readonly canUndo: boolean;
  readonly canRedo: boolean;

  readonly tracker: MistakeTracker;
  readonly past: readonly Snapshot[];
  readonly future: readonly Snapshot[];
}

export type Action =
  | { type: 'selectCell'; cell: CellIndex | null }
  | { type: 'loadDigit'; digit: Loaded }
  | { type: 'setMode'; mode: InputMode }
  | { type: 'toggleNotesMode' }
  | { type: 'placeDigit'; cell: CellIndex; digit: Digit }
  | { type: 'toggleNote'; cell: CellIndex; digit: Digit }
  | { type: 'erase'; cell: CellIndex }
  | { type: 'hint' }
  | { type: 'undo' }
  | { type: 'redo' };

export function createSession(options: SessionOptions): SessionState {
  const tracker = createMistakeTracker();

  return {
    givens: options.givens,
    solution: options.solution,
    grid: options.givens,
    notes: emptyNotes(),
    mistakes: 0,
    hintsUsed: 0,
    hintedCells: [],
    assisted: false,
    mode: options.mode ?? 'cellFirst',
    checking: options.checking ?? true,
    notesMode: false,
    selected: null,
    loadedDigit: null,
    status: 'playing',
    canUndo: false,
    canRedo: false,
    tracker,
    past: [],
    future: [],
  };
}

function isGiven(state: SessionState, cell: CellIndex): boolean {
  return getCell(state.givens, cell) !== 0;
}

function snapshot(state: SessionState): Snapshot {
  return { grid: state.grid, notes: state.notes };
}

function statusOf(grid: Grid, tracker: MistakeTracker): SessionStatus {
  if (tracker.locked) return 'failed';
  return isSolved(grid) ? 'solved' : 'playing';
}

/** Commit an undoable change: push the previous state and drop any redo stack. */
function commit(
  state: SessionState,
  next: { grid: Grid; notes: Notes; tracker?: MistakeTracker },
): SessionState {
  const tracker = next.tracker ?? state.tracker;

  return {
    ...state,
    grid: next.grid,
    notes: next.notes,
    tracker,
    mistakes: tracker.mistakes,
    status: statusOf(next.grid, tracker),
    past: [...state.past, snapshot(state)],
    future: [],
    canUndo: true,
    canRedo: false,
  };
}

export function apply(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'selectCell':
      return { ...state, selected: action.cell };

    case 'loadDigit':
      return {
        ...state,
        loadedDigit: action.digit,
        tracker: loadDigitInTracker(state.tracker, action.digit),
      };

    case 'setMode':
      return { ...state, mode: action.mode, tracker: loadDigitInTracker(state.tracker, null) };

    case 'toggleNotesMode':
      return { ...state, notesMode: !state.notesMode };

    case 'placeDigit':
      return placeDigit(state, action.cell, action.digit);

    case 'toggleNote':
      return writeNote(state, action.cell, action.digit);

    case 'erase':
      return erase(state, action.cell);

    case 'hint':
      return takeHint(state);

    case 'undo':
      return undo(state);

    case 'redo':
      return redo(state);
  }
}

function placeDigit(state: SessionState, cell: CellIndex, digit: Digit): SessionState {
  if (state.status !== 'playing') return state;
  if (isGiven(state, cell)) return state;

  if (state.notesMode) return writeNote(state, cell, digit);

  const grid = setCell(state.grid, cell, digit);
  const notes = clearPeerNotes(state.notes, cell, digit);
  const correct = state.solution[cell] === digit;

  // With checking off nothing is flagged and nothing is tallied, so a wrong
  // digit simply sits on the board until the player revisits it.
  if (!state.checking) return commit(state, { grid, notes });

  const tracker = correct
    ? releaseContainment(state.tracker)
    : recordWrongPlacement(state.tracker, { mode: state.mode, digit });

  return commit(state, { grid, notes, tracker });
}

function writeNote(state: SessionState, cell: CellIndex, digit: Digit): SessionState {
  if (state.status !== 'playing') return state;
  if (isGiven(state, cell)) return state;
  if (getCell(state.grid, cell) !== 0) return state;

  return commit(state, { grid: state.grid, notes: toggleNote(state.notes, cell, digit) });
}

/** Clears the entry if there is one, otherwise the notes. */
function erase(state: SessionState, cell: CellIndex): SessionState {
  if (state.status !== 'playing') return state;
  if (isGiven(state, cell)) return state;

  if (getCell(state.grid, cell) !== 0) {
    // Erasing a wrong digit is how a player corrects the error that ended a
    // digit-first containment window, so the next slip is charged again.
    return commit(state, {
      grid: setCell(state.grid, cell, 0),
      notes: state.notes,
      tracker: releaseContainment(state.tracker),
    });
  }

  if (notesAt(state.notes, cell) === 0) return state;
  return commit(state, { grid: state.grid, notes: clearNotesAt(state.notes, cell) });
}

/**
 * Hints are irreversible. Rather than sit on the undo stack, the revealed digit
 * is written into every stored snapshot as well as the live grid — so undo can
 * walk back through the player's own entries without ever lifting a hint.
 */
function takeHint(state: SessionState): SessionState {
  if (state.status !== 'playing') return state;
  if (state.hintsUsed >= MAX_HINTS) return state;

  const hint = chooseHint(state.grid, state.solution, state.selected);
  if (hint === null) return state;

  const grid = setCell(state.grid, hint.cell, hint.digit);
  const notes = clearPeerNotes(state.notes, hint.cell, hint.digit);
  const burnIn = (entry: Snapshot): Snapshot => ({
    grid: setCell(entry.grid, hint.cell, hint.digit),
    notes: clearPeerNotes(entry.notes, hint.cell, hint.digit),
  });

  return {
    ...state,
    grid,
    notes,
    hintsUsed: state.hintsUsed + 1,
    hintedCells: [...state.hintedCells, hint.cell],
    assisted: true,
    status: statusOf(grid, state.tracker),
    past: state.past.map(burnIn),
    future: state.future.map(burnIn),
  };
}

/** Moves the grid and notes only — the tally and spent hints do not travel. */
function undo(state: SessionState): SessionState {
  const previous = state.past[state.past.length - 1];
  if (previous === undefined) return state;

  const past = state.past.slice(0, -1);
  const future = [snapshot(state), ...state.future];

  return {
    ...state,
    grid: previous.grid,
    notes: previous.notes,
    status: statusOf(previous.grid, state.tracker),
    past,
    future,
    canUndo: past.length > 0,
    canRedo: true,
  };
}

function redo(state: SessionState): SessionState {
  const next = state.future[0];
  if (next === undefined) return state;

  const future = state.future.slice(1);
  const past = [...state.past, snapshot(state)];

  return {
    ...state,
    grid: next.grid,
    notes: next.notes,
    status: statusOf(next.grid, state.tracker),
    past,
    future,
    canUndo: true,
    canRedo: future.length > 0,
  };
}
