import { afterEach, describe, expect, it } from 'vitest';
import { apply, createSession, parseGrid } from '@nonet/engine';
import { resume, save, toRecord } from '../src/lib/autosave';
import { readAutosave } from '../src/lib/storage';
import type { PuzzleRef } from '../src/lib/storage';

const PUZZLE =
  '53..7....' + '6..195...' + '.98....6.' + '8...6...3' + '4..8.3..1' +
  '7...2...6' + '.6....28.' + '...419..5' + '....8..79';
const SOLUTION =
  '534678912' + '672195348' + '198342567' + '859761423' + '426853791' +
  '713924856' + '961537284' + '287419635' + '345286179';

const ref: PuzzleRef = { kind: 'practice', difficulty: 'medium', seed: 1 };

const fresh = () =>
  createSession({ givens: parseGrid(PUZZLE), solution: parseGrid(SOLUTION) });

afterEach(() => window.localStorage.clear());

describe('a saved puzzle comes back as it was left', () => {
  it('restores entries, notes, the tally and the timer', () => {
    let session = fresh();
    session = apply(session, { type: 'placeDigit', cell: 2, digit: 4 });
    session = apply(session, { type: 'toggleNote', cell: 3, digit: 6 });
    // A wrong digit, so the tally has something in it to lose.
    session = apply(session, { type: 'placeDigit', cell: 5, digit: 9 });

    save(ref, session, 125_000);
    const resumed = resume(ref, fresh());

    expect(resumed?.session.grid[2]).toBe(4);
    expect(resumed?.session.notes[3]).toBe(session.notes[3]);
    expect(resumed?.session.mistakes).toBe(1);
    expect(resumed?.elapsedMs).toBe(125_000);
  });

  /** Unlimited undo means unlimited within a sitting (NONET-9). */
  it('comes back with no undo history', () => {
    let session = fresh();
    session = apply(session, { type: 'placeDigit', cell: 2, digit: 4 });
    expect(session.canUndo).toBe(true);

    save(ref, session, 0);
    expect(resume(ref, fresh())?.session.canUndo).toBe(false);
  });

  it('keeps a hint spent, so the cost cannot be shed by reloading', () => {
    let session = fresh();
    session = apply(session, { type: 'selectCell', cell: 2 });
    session = apply(session, { type: 'hint' });

    save(ref, session, 0);
    const resumed = resume(ref, fresh());

    expect(resumed?.session.hintsUsed).toBe(1);
    expect(resumed?.session.assisted).toBe(true);
  });

  it('keeps a locked board locked', () => {
    let session = fresh();
    // Cells 2, 3 and 5 solve to 4, 6 and 8, so a 9 in each is three distinct
    // mistakes. (Cell 6 solves to 9 — placing it there costs nothing.)
    for (const cell of [2, 3, 5] as const) {
      session = apply(session, { type: 'placeDigit', cell, digit: 9 });
    }
    expect(session.status).toBe('failed');

    save(ref, session, 0);
    expect(resume(ref, fresh())?.session.status).toBe('failed');
  });

  it('has nothing to resume before anything is played', () => {
    expect(resume(ref, fresh())).toBeNull();
  });
});

describe('refusing a save that did not come from playing', () => {
  it('falls back rather than resuming a grid that contradicts the givens', () => {
    const session = fresh();
    const record = toRecord(ref, session, 0);
    // Cell 0 is a given of 5.
    window.localStorage.setItem(
      `nonet:autosave:practice:medium:1`,
      JSON.stringify({ ...record, grid: `9${record.grid.slice(1)}` }),
    );

    expect(resume(ref, fresh())).toBeNull();
  });

  it('falls back rather than resuming an impossible tally', () => {
    const record = toRecord(ref, fresh(), 0);
    window.localStorage.setItem(
      `nonet:autosave:practice:medium:1`,
      JSON.stringify({ ...record, mistakes: 7 }),
    );

    expect(resume(ref, fresh())).toBeNull();
  });
});

/*
 * Settings survive a resume.
 *
 * `resume` rebuilds the session from the fresh one, so anything it forgets to
 * carry across is a setting that silently stops working the moment a player
 * reloads — the same shape of bug as the timer in NONET-20.
 */
it('carries the play settings onto a resumed board', () => {
  const session = createSession({
    givens: parseGrid(PUZZLE),
    solution: parseGrid(SOLUTION),
    mode: 'digitFirst',
    checking: false,
    autoAdvance: true,
  });

  save(ref, session, 1000);
  const resumed = resume(ref, session);

  expect(resumed?.session.autoAdvance).toBe(true);
  expect(resumed?.session.mode).toBe('digitFirst');
  expect(resumed?.session.checking).toBe(false);
});
