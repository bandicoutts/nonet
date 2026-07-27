import { getCell, setCell } from '../grid.ts';
import { CELL_COUNT } from '../types.ts';
import type { CellIndex, Digit, Grid, Notes } from '../types.ts';
import { isSolved } from '../validate.ts';
import { chooseHint, MAX_HINTS } from './hints.ts';
import {
  MAX_MISTAKES,
  createMistakeTracker,
  loadDigit as loadDigitInTracker,
  recordWrongPlacement,
  releaseContainment,
} from './mistakes.ts';
import type { InputMode, MistakeTracker } from './mistakes.ts';
import { clearNotesAt, clearPeerNotes, emptyNotes, notesAt, toggleNote } from './notes.ts';

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

export interface RestoreOptions extends SessionOptions {
  /** The board as the player left it, givens included. */
  readonly grid: Grid;
  readonly notes: Notes;
  readonly mistakes?: number;
  readonly hintsUsed?: number;
  readonly hintedCells?: readonly CellIndex[];
}

/**
 * Resume a saved puzzle.
 *
 * Restoring is rule work, not deserialisation: whether a board is finished,
 * whether it is locked, and whether a spent hint still marks the solve assisted
 * are all engine questions, and answering them in the app would put the rules
 * in two places (NONET-8).
 *
 * Three things deliberately do **not** come back.
 *
 * The **undo history** is empty, because it is never saved — it is a full
 * grid-and-notes snapshot per action and would grow the payload without bound
 * on a write that happens every keystroke. Unlimited undo means unlimited
 * within a sitting (NONET-9).
 *
 * **Digit-first containment** is dropped. It is an allowance within a gesture:
 * the digit is loaded, it has already cost a life, and further misplacements of
 * it are free until the player moves on. Nothing is loaded after a reload, so
 * carrying it across would hand out a free mistake.
 *
 * **Selection** is dropped for the same reason — the cursor is where the player
 * was looking, not part of the puzzle.
 *
 * A save is bytes from a device we do not control: localStorage is editable by
 * hand and a sync can deliver a row written by an older version. Anything that
 * could not have come from play is refused rather than resumed into, and the
 * caller falls back to a fresh puzzle.
 */
export function restoreSession(options: RestoreOptions): SessionState {
  const { givens, grid, notes } = options;
  const mistakes = options.mistakes ?? 0;
  const hintsUsed = options.hintsUsed ?? 0;

  if (grid.length !== CELL_COUNT) {
    throw new Error(`A saved grid needs exactly 81 cells, received ${grid.length}`);
  }
  if (notes.length !== CELL_COUNT) {
    throw new Error(`Saved notes need exactly 81 cells, received ${notes.length}`);
  }

  // A given is the puzzle itself. A save that disagrees with one was not
  // produced by playing, since givens are inert to every action.
  for (let cell = 0; cell < CELL_COUNT; cell += 1) {
    const given = givens[cell] ?? 0;
    if (given !== 0 && grid[cell] !== given) {
      throw new Error(`Saved grid contradicts the given at cell ${cell}`);
    }
  }

  if (!Number.isInteger(mistakes) || mistakes < 0 || mistakes > MAX_MISTAKES) {
    throw new Error(`Saved mistakes must be between 0 and ${MAX_MISTAKES}, received ${mistakes}`);
  }
  if (!Number.isInteger(hintsUsed) || hintsUsed < 0 || hintsUsed > MAX_HINTS) {
    throw new Error(`Saved hints must be between 0 and ${MAX_HINTS}, received ${hintsUsed}`);
  }

  const tracker: MistakeTracker = {
    mistakes,
    locked: mistakes >= MAX_MISTAKES,
    containedDigit: null,
  };

  return {
    ...createSession(options),
    grid,
    notes,
    mistakes,
    hintsUsed,
    hintedCells: options.hintedCells ?? [],
    // One hint marks the solve assisted for the rest of the puzzle, reload or
    // not — otherwise the cost could be shed by closing the tab.
    assisted: hintsUsed > 0,
    status: statusOf(grid, tracker),
    tracker,
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
