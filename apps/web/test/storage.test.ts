import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOSAVE_FIELDS,
  appendSolve,
  clearAutosave,
  localDate,
  readAutosave,
  readSolves,
  refKey,
  writeAutosave,
} from '../src/lib/storage';
import type { AutosaveRecord, PuzzleRef } from '../src/lib/storage';

const ref: PuzzleRef = { kind: 'practice', difficulty: 'medium', seed: 20260727 };

function record(overrides: Partial<AutosaveRecord> = {}): AutosaveRecord {
  return {
    version: 1,
    ref,
    grid: '5'.repeat(81),
    notes: Array.from({ length: 81 }, () => 0),
    elapsedMs: 90_000,
    mistakes: 1,
    hintsUsed: 0,
    updatedAt: '2026-07-27T10:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('the autosave record', () => {
  /**
   * The guest record and the `autosaves` row are the same fields under
   * different names. The merge compares them directly — latest wins for a
   * puzzle in progress — so a field that exists on one side and not the other
   * is a field the merge silently drops.
   */
  it('carries exactly the columns the autosaves table has', () => {
    expect([...AUTOSAVE_FIELDS].sort()).toEqual(
      ['elapsedMs', 'grid', 'hintsUsed', 'mistakes', 'notes', 'updatedAt'].sort(),
    );
  });

  it('does not carry the undo stack', () => {
    writeAutosave(record());
    expect(JSON.stringify(readAutosave(ref))).not.toMatch(/past|future|undo/i);
  });

  it('round-trips', () => {
    const saved = record();
    writeAutosave(saved);
    expect(readAutosave(ref)).toEqual(saved);
  });

  it('is absent before anything is saved', () => {
    expect(readAutosave(ref)).toBeNull();
  });

  it('is removed when the puzzle is finished or abandoned', () => {
    writeAutosave(record());
    clearAutosave(ref);
    expect(readAutosave(ref)).toBeNull();
  });

  it('keeps puzzles apart', () => {
    const other: PuzzleRef = { ...ref, seed: 999 };
    writeAutosave(record());
    expect(readAutosave(other)).toBeNull();
  });
});

/**
 * Guest-first means localStorage is a convenience, never a dependency
 * (ARCHITECTURE.md). Every failure below has to leave the player with a
 * playable board rather than a broken one.
 */
describe('surviving a hostile localStorage', () => {
  it('treats unparseable data as no save at all', () => {
    window.localStorage.setItem(refKey(ref), '{ not json');
    expect(readAutosave(ref)).toBeNull();
  });

  it('rejects a record from a version it does not understand', () => {
    window.localStorage.setItem(refKey(ref), JSON.stringify({ ...record(), version: 99 }));
    expect(readAutosave(ref)).toBeNull();
  });

  it('rejects a record with a grid that is not 81 cells', () => {
    window.localStorage.setItem(refKey(ref), JSON.stringify({ ...record(), grid: '123' }));
    expect(readAutosave(ref)).toBeNull();
  });

  it('rejects a record whose notes are the wrong length', () => {
    window.localStorage.setItem(refKey(ref), JSON.stringify({ ...record(), notes: [1, 2] }));
    expect(readAutosave(ref)).toBeNull();
  });

  it('does not throw when the quota is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(() => writeAutosave(record())).not.toThrow();
  });

  it('does not throw when storage is unavailable entirely', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(readAutosave(ref)).toBeNull();
    expect(readSolves()).toEqual([]);
  });
});

describe('the local calendar day', () => {
  /**
   * Streak days use the device's timezone at the moment of the solve (NONET-9).
   * `toISOString().slice(0, 10)` would be UTC, which is the one thing this must
   * not be: in Auckland it would roll the day over at lunchtime.
   */
  it('is the device day, not the UTC day', () => {
    // 22:30 on the 27th in a zone two hours ahead of UTC is still the 27th
    // locally and already the 27th in UTC — so use a moment where they differ.
    const at = new Date(2026, 6, 27, 23, 30, 0);
    expect(localDate(at)).toBe('2026-07-27');
    // Sanity: the naive UTC reading of the same instant may well be the 28th.
    expect(localDate(at)).toBe(
      `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`,
    );
  });

  it('pads single-digit months and days', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('guest solves', () => {
  it('starts empty', () => {
    expect(readSolves()).toEqual([]);
  });

  it('appends, keeping what came before', () => {
    appendSolve({ ref, solvedAt: '2026-07-26T10:00:00.000Z', localDate: '2026-07-26', durationMs: 1, mistakes: 0, usedHint: false, attempt: 1, checked: true, kind: 'practice' });
    appendSolve({ ref, solvedAt: '2026-07-27T10:00:00.000Z', localDate: '2026-07-27', durationMs: 2, mistakes: 0, usedHint: false, attempt: 1, checked: true, kind: 'practice' });

    expect(readSolves()).toHaveLength(2);
    expect(readSolves()[1]?.localDate).toBe('2026-07-27');
  });

  it('ignores a corrupt list rather than losing the ability to play', () => {
    window.localStorage.setItem('nonet:solves', '{ not json');
    expect(readSolves()).toEqual([]);
  });
});
