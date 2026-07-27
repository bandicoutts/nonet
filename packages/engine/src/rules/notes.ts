import { removeCandidate, toggleCandidate } from '../candidates.js';
import { CELL_COUNT } from '../types.js';
import type { CandidateMask, CellIndex, Digit, Notes } from '../types.js';
import { PEERS } from '../units.js';

export function emptyNotes(): Notes {
  return new Array<CandidateMask>(CELL_COUNT).fill(0);
}

export function notesAt(notes: Notes, cell: CellIndex): CandidateMask {
  return notes[cell] ?? 0;
}

export function setNotesAt(notes: Notes, cell: CellIndex, mask: CandidateMask): Notes {
  const next = [...notes];
  next[cell] = mask;
  return next;
}

export function clearNotesAt(notes: Notes, cell: CellIndex): Notes {
  return setNotesAt(notes, cell, 0);
}

/** Add the digit if absent, remove it if present. */
export function toggleNote(notes: Notes, cell: CellIndex, digit: Digit): Notes {
  return setNotesAt(notes, cell, toggleCandidate(notesAt(notes, cell), digit));
}

/**
 * Housekeeping after a digit is placed: the cell's own notes go, and the digit
 * is struck from the notes of every cell sharing its row, column or box.
 *
 * Nothing else is touched — other digits in those peers survive, and cells that
 * are not peers are left exactly as they were.
 */
export function clearPeerNotes(notes: Notes, cell: CellIndex, digit: Digit): Notes {
  const next = [...notes];
  next[cell] = 0;

  for (const peer of PEERS[cell] ?? []) {
    next[peer] = removeCandidate(next[peer] ?? 0, digit);
  }

  return next;
}
