'use client';

/**
 * Running the merge against a real account.
 *
 * The decisions all live in `merge.ts` as pure functions; this is the plumbing
 * that fetches both sides, applies them and writes the result back. Keeping the
 * two apart is what makes the rules testable without a database — and the rules
 * are the part where being wrong loses a player's history.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { currentStreak } from './streak';
import { mergeAutosave, mergeFailures, mergeSettings, mergeSolves } from './merge';
import type { GuestFailure, MergeReport } from './merge';
import { fromProfileRow, readSettings, toProfileRow, writeSettings } from './settings';
import { readFailures } from './puzzles';
import { listAutosaves, localDate, readSolves, writeAutosave } from './storage';
import type { AutosaveRecord, GuestSolve, PuzzleRef } from './storage';

const SOLVES_KEY = 'nonet:solves';

interface PuzzleRow {
  readonly id: string;
  readonly kind: 'daily' | 'practice';
  readonly difficulty: PuzzleRef['difficulty'];
  readonly seed: number;
}

/** A solve joined to the puzzle that identifies it, so both sides share a shape. */
interface SolveRow {
  readonly puzzle_id: string;
  readonly local_date: string;
  readonly solved_at: string;
  readonly duration_ms: number;
  readonly mistakes: number;
  readonly used_hint: boolean;
  readonly attempt: 1 | 2;
  readonly checked: boolean;
  readonly kind: GuestSolve['kind'];
  readonly puzzles: PuzzleRow | null;
}

function toGuestSolve(row: SolveRow): GuestSolve | null {
  if (row.puzzles === null) return null;
  return {
    ref: { kind: row.puzzles.kind, difficulty: row.puzzles.difficulty, seed: row.puzzles.seed },
    solvedAt: row.solved_at,
    localDate: row.local_date,
    durationMs: row.duration_ms,
    mistakes: row.mistakes,
    usedHint: row.used_hint,
    attempt: row.attempt,
    checked: row.checked,
    kind: row.kind,
  };
}

/**
 * Resolve a guest's `(kind, difficulty, seed)` to a puzzle id.
 *
 * A guest has never seen a row, which is exactly why `unique (kind, difficulty,
 * seed)` exists on `puzzles`. A daily the account has never had a row for
 * cannot be uploaded — its edition may not have been published on this
 * deployment — so it is skipped rather than invented.
 */
async function resolveIds(
  supabase: SupabaseClient,
  refs: readonly PuzzleRef[],
): Promise<Map<string, string>> {
  const byKey = new Map<string, string>();
  if (refs.length === 0) return byKey;

  const { data } = await supabase
    .from('puzzles')
    .select('id, kind, difficulty, seed')
    .in('seed', [...new Set(refs.map((r) => r.seed))]);

  for (const row of (data ?? []) as PuzzleRow[]) {
    byKey.set(`${row.kind}:${row.difficulty}:${row.seed}`, row.id);
  }

  return byKey;
}

export interface SyncResult extends MergeReport {
  /** The streak the player has after the merge, over the union of both sides. */
  readonly streak: number;
  readonly totalSolves: number;
}

/**
 * Merge this browser into the account, once, after signing in.
 *
 * Order matters: solves first, because whether a board is still in progress
 * depends on whether the puzzle has been solved on *either* side.
 */
export async function syncAfterSignIn(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult> {
  const guestSolves = readSolves();

  const { data: solveRows } = await supabase
    .from('solves')
    .select(
      'puzzle_id, local_date, solved_at, duration_ms, mistakes, used_hint, attempt, checked, kind, puzzles(id, kind, difficulty, seed)',
    );

  const serverSolves = ((solveRows ?? []) as unknown as SolveRow[])
    .map(toGuestSolve)
    .filter((s): s is GuestSolve => s !== null);

  const solves = mergeSolves(guestSolves, serverSolves);

  // Upload what the account has never seen.
  const ids = await resolveIds(supabase, solves.toUpload.map((s) => s.ref));
  const rows = solves.toUpload
    .map((solve) => {
      const { kind, difficulty, seed } = solve.ref;
      const puzzleId = ids.get(`${kind}:${difficulty}:${seed}`);
      if (puzzleId === undefined) return null;
      return {
        user_id: userId,
        puzzle_id: puzzleId,
        solved_at: solve.solvedAt,
        local_date: solve.localDate,
        duration_ms: solve.durationMs,
        mistakes: solve.mistakes,
        used_hint: solve.usedHint,
        attempt: solve.attempt,
        checked: solve.checked,
        kind: solve.kind,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length > 0) {
    // The unique index on (user_id, puzzle_id, attempt) makes this safe to
    // repeat, which matters because a half-finished sync is retried by the
    // player simply signing in again.
    await supabase.from('solves').upsert(rows, { onConflict: 'user_id,puzzle_id,attempt' });
  }

  /*
   * Failures, by the same shape and for the same reason.
   *
   * A separate table, because a failure is not a solve (NONET-17) — but it
   * still has to cross at sign-in, or a player's archive would differ between
   * devices, which is the inconsistency sync exists to prevent (NONET-27).
   */
  await syncFailures(supabase, userId);

  // The merged history is what this browser now holds, so a later sign-out
  // leaves the player with everything rather than only their guest half.
  try {
    window.localStorage.setItem(SOLVES_KEY, JSON.stringify(solves.merged));
  } catch {
    // Out of space. The account still has the union, which is the copy that
    // matters.
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // A profile whose row has never been written to is one whose settings are
  // column defaults, which is how "first sign-in" is recognised without storing
  // a flag for it.
  const profileIsNew = profile?.['settings_synced_at'] == null;
  const settings = mergeSettings(
    readSettings(),
    fromProfileRow((profile ?? {}) as Record<string, unknown>),
    profileIsNew,
  );
  writeSettings(settings);
  await supabase
    .from('profiles')
    .update({ ...toProfileRow(settings), settings_synced_at: new Date().toISOString() })
    .eq('id', userId);

  const board = await mergeInProgress(supabase, userId, solves.merged);

  return {
    solves: solves.summary,
    keptBoard: board.keep,
    discardedBecauseSolved: board.discardedBecauseSolved,
    settingsFrom: profileIsNew ? 'guest' : 'account',
    streak: currentStreak(
      solves.merged.filter((s) => s.kind === 'daily'),
      localDate(),
    ),
    totalSolves: solves.merged.length,
  };
}

/** The in-progress half. Split out only to keep the function above readable. */
async function mergeInProgress(
  supabase: SupabaseClient,
  userId: string,
  mergedSolves: readonly GuestSolve[],
): Promise<ReturnType<typeof mergeAutosave>> {
  const { data: rows } = await supabase
    .from('autosaves')
    .select('grid, notes, elapsed_ms, mistakes, hints_used, updated_at, puzzles(kind, difficulty, seed)')
    .limit(1);

  const row = (rows ?? [])[0] as
    | {
        grid: string;
        notes: number[];
        elapsed_ms: number;
        mistakes: number;
        hints_used: number;
        updated_at: string;
        puzzles: PuzzleRow | null;
      }
    | undefined;

  const server: AutosaveRecord | null =
    row === undefined || row.puzzles === null
      ? null
      : {
          version: 1,
          ref: {
            kind: row.puzzles.kind,
            difficulty: row.puzzles.difficulty,
            seed: row.puzzles.seed,
          },
          grid: row.grid,
          notes: row.notes,
          elapsedMs: row.elapsed_ms,
          mistakes: row.mistakes,
          hintsUsed: row.hints_used,
          updatedAt: row.updated_at,
        };

  // The guest's side is found by looking, not by asking the server what to look
  // for: a board the account has never seen is precisely the case where the
  // guest's is the one that should win, and reading only the server's ref would
  // make that outcome unreachable. Most recently touched, since only one board
  // is in flight.
  const guest = listAutosaves()[0] ?? null;
  const result = mergeAutosave(guest, server, mergedSolves);

  if (result.keep === 'server' && server !== null) {
    writeAutosave(server);
    return result;
  }

  if (result.keep === 'guest' && guest !== null) {
    const ids = await resolveIds(supabase, [guest.ref]);
    const { kind, difficulty, seed } = guest.ref;
    const puzzleId = ids.get(`${kind}:${difficulty}:${seed}`);

    if (puzzleId !== undefined) {
      await supabase.from('autosaves').upsert(
        {
          user_id: userId,
          puzzle_id: puzzleId,
          puzzle_kind: kind,
          grid: guest.grid,
          notes: guest.notes,
          elapsed_ms: guest.elapsedMs,
          mistakes: guest.mistakes,
          hints_used: guest.hintsUsed,
          updated_at: guest.updatedAt,
        },
        { onConflict: 'user_id,puzzle_id' },
      );
    }
  }

  return result;
}

/** Upload the failures the account has not seen, or has an older count for. */
async function syncFailures(supabase: SupabaseClient, userId: string): Promise<void> {
  const guest = readFailures();
  if (guest.length === 0) return;

  const { data } = await supabase
    .from('failures')
    .select('puzzle_id, local_date, attempts, puzzles(id, kind, difficulty, seed)');

  const server = ((data ?? []) as unknown as FailureRow[])
    .map((row) => {
      const puzzle = Array.isArray(row.puzzles) ? row.puzzles[0] : row.puzzles;
      if (puzzle === undefined || puzzle === null) return null;
      return {
        ref: { kind: puzzle.kind, difficulty: puzzle.difficulty, seed: puzzle.seed },
        localDate: row.local_date,
        attempts: row.attempts,
      } as GuestFailure;
    })
    .filter((f): f is GuestFailure => f !== null);

  const { upload } = mergeFailures(guest, server);
  if (upload.length === 0) return;

  const ids = await resolveIds(supabase, upload.map((f) => f.ref));
  const rows = upload
    .map((failure) => {
      const { kind, difficulty, seed } = failure.ref;
      const puzzleId = ids.get(`${kind}:${difficulty}:${seed}`);
      // A puzzle with no row on this deployment is skipped rather than
      // invented, exactly as an unpublished daily is for solves.
      if (puzzleId === undefined) return null;
      return {
        user_id: userId,
        puzzle_id: puzzleId,
        local_date: failure.localDate,
        attempts: failure.attempts,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length > 0) {
    // Keyed on (user_id, puzzle_id), so a repeat is a no-op and a half-finished
    // sync is retried by signing in again.
    await supabase.from('failures').upsert(rows, { onConflict: 'user_id,puzzle_id' });
  }
}

interface FailureRow {
  readonly puzzle_id: string;
  readonly local_date: string;
  readonly attempts: number;
  readonly puzzles: PuzzleRow | PuzzleRow[] | null;
}
