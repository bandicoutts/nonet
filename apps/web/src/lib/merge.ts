/**
 * Reconciling a guest's history with an account's.
 *
 * This is the only place in the product where being wrong destroys a player's
 * data rather than merely looking wrong, and no design mock can express any of
 * it — which is why the rules live here as pure functions over two lists, and
 * why every one of them is a test (ARCHITECTURE.md).
 *
 * Three rules, and they all lean the same way so there is one thing to
 * remember rather than three:
 *
 * - **Server wins for completed solves.** A finished run is a fact, and the
 *   account is where facts live.
 * - **Latest wins for a puzzle in progress**, ties going to the server.
 * - **Settings take the server profile**, except on a first sign-in, where the
 *   profile is nothing but column defaults.
 *
 * The result is *reported*, never negotiated. A one-time summary states what
 * merged, which run stands and which in-progress board was kept, and then the
 * player carries on (NONET-2).
 */
import type { Settings } from './settings';
import type { AutosaveRecord, GuestSolve, PuzzleRef } from './storage';

/** What identifies one run: a puzzle, and which attempt at it. */
function runKey(solve: GuestSolve): string {
  const { kind, difficulty, seed } = solve.ref;
  return `${kind}:${difficulty}:${seed}:${solve.attempt}`;
}

function refKeyOf(ref: PuzzleRef): string {
  return `${ref.kind}:${ref.difficulty}:${ref.seed}`;
}

export interface SolveMergeSummary {
  /** Guest runs the account had never seen. */
  readonly uploaded: number;
  /** Account runs this device had never seen. */
  readonly adopted: number;
  /** Guest runs discarded because the account already had that attempt. */
  readonly superseded: number;
}

export interface SolveMerge {
  /** Everything the player has now, from both sides. */
  readonly merged: readonly GuestSolve[];
  /** The subset to write to the server. */
  readonly toUpload: readonly GuestSolve[];
  readonly summary: SolveMergeSummary;
}

/**
 * Server wins for completed solves.
 *
 * "Wins" means the server's row stands where both sides have the same puzzle
 * *and* the same attempt — not the faster one, not the more recent one. A first
 * attempt and a retry are two different runs and both survive.
 *
 * Deliberately idempotent: merging the result with itself uploads nothing. A
 * player who signs in on the same device twice should not re-send their whole
 * history, and a merge that is not stable would grow the table on every visit.
 */
export function mergeSolves(
  guest: readonly GuestSolve[],
  server: readonly GuestSolve[],
): SolveMerge {
  const byKey = new Map<string, GuestSolve>();
  for (const solve of server) byKey.set(runKey(solve), solve);

  const toUpload: GuestSolve[] = [];
  let superseded = 0;

  for (const solve of guest) {
    const key = runKey(solve);
    if (byKey.has(key)) {
      superseded += 1;
      continue;
    }
    byKey.set(key, solve);
    toUpload.push(solve);
  }

  const serverKeys = new Set(server.map(runKey));
  const guestKeys = new Set(guest.map(runKey));
  const adopted = [...serverKeys].filter((key) => !guestKeys.has(key)).length;

  return {
    merged: [...byKey.values()],
    toUpload,
    summary: { uploaded: toUpload.length, adopted, superseded },
  };
}

export interface AutosaveMerge {
  readonly keep: 'guest' | 'server' | 'neither';
  /** Whether the guest board should be written to the server. */
  readonly upload: boolean;
  /** True when a board was dropped because that puzzle is already finished. */
  readonly discardedBecauseSolved: boolean;
}

/**
 * Latest wins for a puzzle in progress.
 *
 * Compared by `updatedAt`, which is why both sides carry one. An exact tie goes
 * to the server, matching every other rule here.
 *
 * **A solved puzzle beats any board for it.** You cannot be part-way through
 * something you have finished, and a board left open on another device is stale
 * the moment the solve lands — resuming into it would let a finished puzzle be
 * played again for a second set of stats. Checked against the *merged* solves,
 * so a run completed on either side counts.
 */
export function mergeAutosave(
  guest: AutosaveRecord | null,
  server: AutosaveRecord | null,
  mergedSolves: readonly GuestSolve[],
): AutosaveMerge {
  const solvedRefs = new Set(mergedSolves.map((s) => refKeyOf(s.ref)));
  const isSolved = (record: AutosaveRecord | null): boolean =>
    record !== null && solvedRefs.has(refKeyOf(record.ref));

  const anySolved = isSolved(guest) || isSolved(server);
  const liveGuest = isSolved(guest) ? null : guest;
  const liveServer = isSolved(server) ? null : server;

  if (liveGuest === null && liveServer === null) {
    return { keep: 'neither', upload: false, discardedBecauseSolved: anySolved };
  }
  if (liveGuest === null) return { keep: 'server', upload: false, discardedBecauseSolved: anySolved };
  if (liveServer === null) return { keep: 'guest', upload: true, discardedBecauseSolved: anySolved };

  const guestIsNewer =
    Date.parse(liveGuest.updatedAt) > Date.parse(liveServer.updatedAt);

  return {
    keep: guestIsNewer ? 'guest' : 'server',
    upload: guestIsNewer,
    discardedBecauseSolved: anySolved,
  };
}

/**
 * Settings are not a merge — there is no honest way to combine two sets of
 * preferences, so the rule is stated rather than inferred.
 *
 * The account wins, because that is what "sign in and they follow you" means.
 * The exception is the first sign-in, where the profile holds nothing but
 * column defaults and the guest's are the only real choices in play: taking the
 * server there would silently reset everything a player had chosen, at exactly
 * the moment they would notice and have no idea why.
 */
export function mergeSettings(
  guest: Settings,
  server: Settings,
  profileIsNew: boolean,
): Settings {
  return profileIsNew ? guest : server;
}

/** What the post-sign-in summary needs to say. It reports; it does not ask. */
export interface MergeReport {
  readonly solves: SolveMergeSummary;
  readonly keptBoard: AutosaveMerge['keep'];
  readonly discardedBecauseSolved: boolean;
  readonly settingsFrom: 'guest' | 'account';
}

/**
 * A puzzle that locked, on either side of the merge.
 *
 * Deliberately not a solve — NONET-17 keeps `solves` for finished runs, and a
 * failure is its own record (NONET-27).
 */
export interface GuestFailure {
  readonly ref: PuzzleRef;
  /** The day the puzzle was **first** lost, in the player's own timezone. */
  readonly localDate: string;
  readonly attempts: number;
}

export interface FailureMerge {
  /** The rows to write. Empty when the account already agrees. */
  readonly upload: readonly GuestFailure[];
}

function failureKey(ref: PuzzleRef): string {
  return `${ref.kind}:${ref.difficulty}:${ref.seed}`;
}

/**
 * Merge failures by union, taking the higher count and the earlier date.
 *
 * **The higher count**, because losing the first attempt on one device and the
 * retry on another means the puzzle was genuinely lost twice — and the count is
 * what gates the retry, so taking the lower one would hand back an attempt the
 * player has already spent.
 *
 * **The earlier date**, because the day a puzzle was lost is the day it was
 * *first* lost. Taking the later one would move the failure onto a day the
 * player may not have been playing at all, which is exactly the kind of quiet
 * fiction the archive exists not to tell.
 *
 * Nothing is uploaded when the account already holds an equal-or-better row, so
 * merging this function's own output is a no-op — the same idempotence every
 * other rule here has, and for the same reason: signing in twice on one device
 * must not re-send a history.
 */
export function mergeFailures(
  guest: readonly GuestFailure[],
  server: readonly GuestFailure[],
): FailureMerge {
  const byKey = new Map<string, GuestFailure>();
  for (const failure of server) byKey.set(failureKey(failure.ref), failure);

  const upload: GuestFailure[] = [];

  for (const mine of guest) {
    const theirs = byKey.get(failureKey(mine.ref));

    if (theirs === undefined) {
      upload.push(mine);
      continue;
    }

    const attempts = Math.max(mine.attempts, theirs.attempts);
    const localDate = mine.localDate < theirs.localDate ? mine.localDate : theirs.localDate;

    // Only write when the row would actually change.
    if (attempts === theirs.attempts && localDate === theirs.localDate) continue;

    upload.push({ ref: mine.ref, localDate, attempts });
  }

  return { upload };
}
