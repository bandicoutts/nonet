import { describe, expect, test } from 'vitest';
import { digitsOf, maskOf } from '../src/candidates.ts';
import { boxOf, colOf, rowOf } from '../src/grid.ts';
import { CELL_COUNT } from '../src/types.ts';
import type { Digit } from '../src/types.ts';
import {
  clearNotesAt,
  clearPeerNotes,
  emptyNotes,
  notesAt,
  setNotesAt,
  toggleNote,
} from '../src/rules/notes.ts';

describe('emptyNotes', () => {
  test('starts with nothing pencilled anywhere', () => {
    const notes = emptyNotes();
    expect(notes).toHaveLength(CELL_COUNT);
    expect(notes.every((mask) => mask === 0)).toBe(true);
  });
});

describe('toggleNote', () => {
  test('adds a digit that is not there', () => {
    expect(digitsOf(notesAt(toggleNote(emptyNotes(), 40, 5), 40))).toEqual([5]);
  });

  test('removes a digit that is', () => {
    const once = toggleNote(emptyNotes(), 40, 5);
    expect(digitsOf(notesAt(toggleNote(once, 40, 5), 40))).toEqual([]);
  });

  test('leaves other cells alone', () => {
    const notes = toggleNote(emptyNotes(), 40, 5);
    expect(notesAt(notes, 41)).toBe(0);
  });

  test('does not mutate the notes it was given', () => {
    const before = emptyNotes();
    toggleNote(before, 40, 5);
    expect(notesAt(before, 40)).toBe(0);
  });
});

describe('clearPeerNotes', () => {
  test('removes the placed digit from every peer', () => {
    let notes = emptyNotes();
    // Pencil a 7 into one cell of each unit the placement shares.
    notes = setNotesAt(notes, 1, maskOf([7]));   // same row
    notes = setNotesAt(notes, 9, maskOf([7]));   // same column
    notes = setNotesAt(notes, 10, maskOf([7]));  // same box

    const after = clearPeerNotes(notes, 0, 7);

    expect(notesAt(after, 1)).toBe(0);
    expect(notesAt(after, 9)).toBe(0);
    expect(notesAt(after, 10)).toBe(0);
  });

  test('clears the placed cell entirely', () => {
    const notes = setNotesAt(emptyNotes(), 0, maskOf([1, 2, 7]));
    expect(notesAt(clearPeerNotes(notes, 0, 7), 0)).toBe(0);
  });

  test('leaves other digits in peer cells untouched', () => {
    const notes = setNotesAt(emptyNotes(), 1, maskOf([3, 7, 9]));
    expect(digitsOf(notesAt(clearPeerNotes(notes, 0, 7), 1))).toEqual([3, 9]);
  });

  test('leaves non-peers untouched', () => {
    // Cell 80 shares no row, column or box with cell 0.
    const notes = setNotesAt(emptyNotes(), 80, maskOf([7]));
    expect(digitsOf(notesAt(clearPeerNotes(notes, 0, 7), 80))).toEqual([7]);
  });

  test('never removes a note it should not', () => {
    // Every cell holds every note; after placing 7 at cell 40 the only losses
    // must be the 7s in cell 40's peers, and everything in cell 40 itself.
    const full = Array.from({ length: CELL_COUNT }, () => maskOf([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    const after = clearPeerNotes(full, 40, 7);

    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      const remaining = digitsOf(notesAt(after, cell));

      if (cell === 40) {
        expect(remaining).toEqual([]);
        continue;
      }

      const isPeer =
        rowOf(cell) === rowOf(40) || colOf(cell) === colOf(40) || boxOf(cell) === boxOf(40);
      const expected: Digit[] = isPeer
        ? [1, 2, 3, 4, 5, 6, 8, 9]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9];

      expect(remaining).toEqual(expected);
    }
  });
});

describe('clearNotesAt', () => {
  test('empties one cell and nothing else', () => {
    let notes = setNotesAt(emptyNotes(), 5, maskOf([1, 2]));
    notes = setNotesAt(notes, 6, maskOf([3, 4]));
    const after = clearNotesAt(notes, 5);
    expect(notesAt(after, 5)).toBe(0);
    expect(digitsOf(notesAt(after, 6))).toEqual([3, 4]);
  });
});
