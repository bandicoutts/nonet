/**
 * What a finished puzzle amounts to.
 *
 * Everything the Solved screen states is derived here, as pure functions over a
 * solve and the history around it — the same shape as `merge.ts`, and for the
 * same reason. A result screen makes claims a player will believe: that a run
 * went from 17 days to 18, that a solve is ranked, that it took seven minutes.
 * None of those is checkable by looking at a screenshot, so they are decided
 * where they can be proved without a database or a browser.
 *
 * The percentile is deliberately **not** here. It is the one figure that cannot
 * be derived locally — it compares a player against everyone who played the same
 * edition — so it arrives from `daily_percentile` and is passed in. Everything
 * else survives Supabase being down, which is what guest-first requires.
 */
import { currentStreak, longestStreak } from './streak';
import { SITE_URL } from './site';
import type { GuestSolve } from './storage';
import { PUBLISH_MINUTE, puzzleNumber } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';

/**
 * Why a solve is not ranked, or that it is.
 *
 * Each non-standard variant carries a note on the screen explaining the missing
 * percentile (`copy.md`). They are mutually exclusive there, so `variantOf`
 * picks one when several apply.
 */
export type ResultVariant = 'standard' | 'unchecked' | 'assisted' | 'second';

export interface Run {
  /** The run before this solve landed. */
  readonly from: number;
  /** The run after it. */
  readonly to: number;
  readonly best: number;
}

export interface Result {
  readonly variant: ResultVariant;
  readonly ranked: boolean;
  readonly difficulty: Difficulty;
  readonly durationMs: number;
  /** `null` when checking was off — there was no tally, so there is no count. */
  readonly mistakes: number | null;
  /** The edition's own date, or `null` for a puzzle that is not a daily. */
  readonly editionDate: string | null;
  readonly number: number | null;
  /** `null` for anything that cannot extend a run. */
  readonly run: Run | null;
  /** Milliseconds to the next edition, for the countdown. */
  readonly nextEditionMs: number;
}

const DAY_MS = 86_400_000;
const PUBLISH_MS = PUBLISH_MINUTE * 60_000;

/**
 * Which note the screen carries.
 *
 * Unchecked wins because it is the only variant that changes a second thing on
 * screen: with no tally there is no honest mistake count, so the stat reads a
 * dash rather than a number, and a note about a hint would leave that
 * unexplained. Assisted beats second attempt because a hint is a choice made
 * during this solve, where the attempt is a fact about a board that already
 * ended.
 */
export function variantOf(solve: GuestSolve): ResultVariant {
  if (!solve.checked) return 'unchecked';
  if (solve.usedHint) return 'assisted';
  if (solve.attempt === 2) return 'second';
  return 'standard';
}

/**
 * Whether this solve earns a percentile.
 *
 * The same predicate `daily_percentile` applies server-side when it counts the
 * cohort — first attempt, unassisted, checked — plus the one it does not need
 * to state, that only a daily has a cohort at all. Practice puzzles are dealt at
 * random and archive editions are played years apart, so there is nobody to be
 * in the top 22% of.
 */
export function isRanked(solve: GuestSolve): boolean {
  return (
    solve.kind === 'daily' && solve.attempt === 1 && !solve.usedHint && solve.checked
  );
}

/**
 * The run before and after this solve.
 *
 * Both sides go through `currentStreak`, so the figure on this screen and the
 * one on Record cannot disagree — and neither can drift from the other after a
 * sign-in merge reorders the rows underneath them (NONET-13). "Before" is the
 * same computation with this solve withheld, which handles the case that makes
 * a naive `to - 1` wrong: a second solve on a day already banked extends
 * nothing, so `from` and `to` are equal.
 *
 * `null` for anything that cannot extend a run — practice, archive and replay
 * record stats and never touch the streak (GAME-RULES.md).
 */
export function runFor(solve: GuestSolve, history: readonly GuestSolve[]): Run | null {
  if (solve.kind !== 'daily') return null;

  const dailies = history.filter((s) => s.kind === 'daily');

  const before = withoutOne(dailies, solve);

  return {
    from: currentStreak(before, solve.localDate),
    to: currentStreak(dailies, solve.localDate),
    best: longestStreak(dailies),
  };
}

/**
 * The list with one occurrence of `solve` removed.
 *
 * Identity first, because that is exact and is what a screen holding the array
 * it searched will have. Falling back to a value match matters more than it
 * looks: `readSolves` parses fresh objects on every call, so a caller that
 * re-reads storage between finding a solve and describing it would leave it on
 * both sides and report a run that never grew. Exactly one occurrence comes
 * out, so a genuine twin on the same day still counts.
 */
function withoutOne(solves: readonly GuestSolve[], solve: GuestSolve): GuestSolve[] {
  let index = solves.indexOf(solve);
  if (index === -1) {
    index = solves.findIndex(
      (s) =>
        s.solvedAt === solve.solvedAt &&
        s.localDate === solve.localDate &&
        s.ref.seed === solve.ref.seed &&
        s.ref.kind === solve.ref.kind,
    );
  }
  return index === -1 ? [...solves] : [...solves.slice(0, index), ...solves.slice(index + 1)];
}

/** `mm:ss`, growing an hours field only when there is one. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const tail = `${pad(minutes)}:${pad(seconds)}`;
  return hours > 0 ? `${hours}:${tail}` : tail;
}

/** `hh:mm:ss`, floored at zero so a lapsed countdown does not run backwards. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map(pad)
    .join(':');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * How long until the next edition exists.
 *
 * The next **00:05 UTC**, not the next midnight. A countdown to midnight hits
 * zero five minutes before the puzzle it is counting to has been published, and
 * a player who acts on it gets an error instead of a board — the client half of
 * the same publish gate `currentEdition` implements (NONET-17).
 */
export function msUntilNextEdition(at: Date = new Date()): number {
  const midnight = Math.floor(at.getTime() / DAY_MS) * DAY_MS;
  const publish = midnight + PUBLISH_MS;
  return publish > at.getTime() ? publish - at.getTime() : publish + DAY_MS - at.getTime();
}

const DIFFICULTY_LABEL: Readonly<Record<Difficulty, string>> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export interface ShareInput {
  readonly number: number;
  readonly difficulty: Difficulty;
  readonly durationMs: number;
  /** `null` when checking was off. */
  readonly mistakes: number | null;
  /** `null` when the solve was not ranked. */
  readonly percentile: number | null;
}

/**
 * The three lines that get copied. No grid, no spoilers.
 *
 * Two departures from `copy.md`, both deliberate. **The mistake count is
 * pluralised** — the export records the singular-always form as a defect rather
 * than a choice, and this is the one string in the product that leaves it.
 * **The percentile and mistake segments drop out** when there is no such figure,
 * rather than being written as some invented placeholder: the prototype only
 * ever drew the ranked, checked case, so those are omissions rather than new
 * copy. Recorded in DECISIONS.md NONET-20.
 *
 * The third line is `SITE_URL`, not a literal. It was `nonet.app` — a domain
 * the project does not own — so every result ever shared named an address that
 * does not resolve.
 */
export function shareText(input: ShareInput): string {
  const segments = [formatDuration(input.durationMs)];

  if (input.mistakes !== null) {
    segments.push(`${input.mistakes} ${input.mistakes === 1 ? 'mistake' : 'mistakes'}`);
  }
  if (input.percentile !== null) {
    segments.push(`top ${input.percentile}%`);
  }

  return [
    `NONET No. ${input.number} · ${DIFFICULTY_LABEL[input.difficulty]}`,
    segments.join(' · '),
    SITE_URL,
  ].join('\n');
}

/** The label a stat block or a share line uses for a band. */
export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABEL[difficulty];
}

/** Everything the screen states, from the solve and the history around it. */
export function buildResult(
  solve: GuestSolve,
  history: readonly GuestSolve[],
  at: Date = new Date(),
): Result {
  const daily = solve.kind === 'daily';

  /*
   * A daily's edition date is its local date. That is exact rather than
   * convenient: a daily can only be solved on the day it is current, so the day
   * the player banked it is the day it was published.
   */
  const editionDate = daily ? solve.localDate : null;

  return {
    variant: variantOf(solve),
    ranked: isRanked(solve),
    difficulty: solve.ref.difficulty,
    durationMs: solve.durationMs,
    mistakes: solve.checked ? solve.mistakes : null,
    editionDate,
    number: editionDate === null ? null : puzzleNumber(editionDate),
    run: runFor(solve, history),
    nextEditionMs: msUntilNextEdition(at),
  };
}
