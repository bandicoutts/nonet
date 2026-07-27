/**
 * Guest storage.
 *
 * Everything works signed out (ARCHITECTURE.md), so this is where a guest's
 * progress lives. It is a *convenience*, never a dependency: localStorage
 * throws outright in some privacy modes, fills up, and can be edited by hand.
 * Every read here can fail to a null and every write can fail to nothing, and
 * in both cases the player still has a playable board.
 *
 * The record shape is deliberately the `autosaves` row under different names.
 * The sign-in merge compares the two directly — latest wins for a puzzle in
 * progress — and a field on one side that is missing from the other is a field
 * the merge silently drops.
 */
import type { Difficulty } from '@nonet/engine';

const AUTOSAVE_PREFIX = 'nonet:autosave:';
const SOLVES_KEY = 'nonet:solves';
const RESUMED_PREFIX = 'nonet:resumed:';

/**
 * A bump means "this shape changed"; an older record is discarded rather than
 * guessed at. Losing one unfinished puzzle is a smaller harm than resuming into
 * a board that means something different than it did when it was written.
 */
const VERSION = 1;

/** The fields that must exist on both sides of the merge. Asserted by test. */
export const AUTOSAVE_FIELDS = [
  'grid',
  'notes',
  'elapsedMs',
  'mistakes',
  'hintsUsed',
  'updatedAt',
] as const;

/**
 * What identifies a puzzle before there is a database row for it.
 *
 * A puzzle is fully determined by its seed within a kind and band, which is
 * exactly the `unique (kind, difficulty, seed)` index on `puzzles` — so a guest
 * record resolves to a server row without needing an id it could not have
 * known.
 */
export interface PuzzleRef {
  readonly kind: 'daily' | 'practice';
  readonly difficulty: Difficulty;
  readonly seed: number;
}

export interface AutosaveRecord {
  readonly version: number;
  readonly ref: PuzzleRef;
  /** 81 cells in reading order, `0` for empty — the engine's grid, as a string. */
  readonly grid: string;
  /** One 9-bit candidate mask per cell. */
  readonly notes: readonly number[];
  readonly elapsedMs: number;
  readonly mistakes: number;
  readonly hintsUsed: number;
  /** ISO instant. What the merge compares. */
  readonly updatedAt: string;
}

export interface GuestSolve {
  readonly ref: PuzzleRef;
  readonly solvedAt: string;
  /** The player's own calendar day — see `localDate`. */
  readonly localDate: string;
  readonly durationMs: number;
  readonly mistakes: number;
  readonly usedHint: boolean;
  readonly attempt: 1 | 2;
  readonly checked: boolean;
  readonly kind: 'daily' | 'archive' | 'practice' | 'replay';
}

export function refKey(ref: PuzzleRef): string {
  return `${AUTOSAVE_PREFIX}${ref.kind}:${ref.difficulty}:${ref.seed}`;
}

/** Read, returning null for anything at all that goes wrong. */
function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Full, or denied. A guest who cannot persist can still finish the puzzle
    // in front of them, which is the part that matters.
  }
}

/**
 * Whether a parsed record is one we can honour.
 *
 * Bytes from localStorage are editable by hand, so the shape is checked rather
 * than trusted. The *rules* are not checked here — whether the board is
 * consistent with its givens is `restoreSession`'s question, and it lives in
 * the engine so there is one answer to it.
 */
function isAutosave(value: unknown): value is AutosaveRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;

  return (
    r['version'] === VERSION &&
    typeof r['grid'] === 'string' &&
    r['grid'].length === 81 &&
    Array.isArray(r['notes']) &&
    r['notes'].length === 81 &&
    r['notes'].every((n) => typeof n === 'number') &&
    typeof r['elapsedMs'] === 'number' &&
    typeof r['mistakes'] === 'number' &&
    typeof r['hintsUsed'] === 'number' &&
    typeof r['updatedAt'] === 'string'
  );
}

export function readAutosave(ref: PuzzleRef): AutosaveRecord | null {
  const value = read(refKey(ref));
  return isAutosave(value) ? value : null;
}

export function writeAutosave(record: AutosaveRecord): void {
  write(refKey(record.ref), record);
}

/**
 * Every board this browser has in progress.
 *
 * The sign-in merge needs the guest's side *before* it knows what the account
 * holds — looking only for boards the server already knows about would mean a
 * guest's in-progress puzzle could never be the thing that gets uploaded, which
 * is half the rule it is implementing.
 */
export function listAutosaves(): AutosaveRecord[] {
  const found: AutosaveRecord[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key === null || !key.startsWith(AUTOSAVE_PREFIX)) continue;
      const value = read(key);
      if (isAutosave(value)) found.push(value);
    }
  } catch {
    return [];
  }
  return found.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

/** Called when the puzzle is finished or abandoned — there is nothing to resume. */
export function clearAutosave(ref: PuzzleRef): void {
  try {
    window.localStorage.removeItem(refKey(ref));
  } catch {
    // Nothing to do. A stale save is harmless: it is only read back for the
    // puzzle it belongs to, and that one is over.
  }
}

/**
 * Mark a board as having arrived from another device.
 *
 * Only the sign-in merge can know this — by the time the board loads it is an
 * ordinary local autosave, indistinguishable from one written here. Without the
 * marker a player opening a puzzle on their laptop finds twenty cells already
 * filled and no way to tell their own work from a bug (NONET-34).
 *
 * Cleared as soon as it is read, so the notice appears once rather than on
 * every visit to that puzzle.
 */
export function markResumedElsewhere(ref: PuzzleRef): void {
  write(`${RESUMED_PREFIX}${ref.kind}:${ref.difficulty}:${ref.seed}`, true);
}

/** Whether this board came from another device, consuming the marker. */
export function takeResumedElsewhere(ref: PuzzleRef): boolean {
  const key = `${RESUMED_PREFIX}${ref.kind}:${ref.difficulty}:${ref.seed}`;
  const marked = read(key) === true;

  try {
    if (marked) window.localStorage.removeItem(key);
  } catch {
    // Unable to clear it, so the notice may show twice. Harmless next to the
    // alternative of never showing it.
  }

  return marked;
}

export function readSolves(): GuestSolve[] {
  const value = read(SOLVES_KEY);
  return Array.isArray(value) ? (value as GuestSolve[]) : [];
}

export function appendSolve(solve: GuestSolve): void {
  write(SOLVES_KEY, [...readSolves(), solve]);
}

/**
 * The player's own calendar day, `YYYY-MM-DD`.
 *
 * Built from the local getters rather than `toISOString().slice(0, 10)`, which
 * is UTC — the one thing this must not be. Streak days are the device's
 * timezone at the moment of the solve (NONET-9); take UTC and Auckland rolls
 * over at lunchtime.
 */
export function localDate(at: Date = new Date()): string {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
