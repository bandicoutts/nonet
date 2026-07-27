import type { Digit } from '../types.js';

/** Three strikes and the board locks. */
export const MAX_MISTAKES = 3;

export type InputMode = 'cellFirst' | 'digitFirst';

export interface MistakeTracker {
  readonly mistakes: number;
  readonly locked: boolean;
  /**
   * The digit currently under containment in digit-first mode: it has already
   * cost a life, and further wrong placements of it are free until the player
   * changes digit or fixes the error.
   */
  readonly containedDigit: Digit | null;
}

export function createMistakeTracker(): MistakeTracker {
  return { mistakes: 0, locked: false, containedDigit: null };
}

function withMistakes(tracker: MistakeTracker, mistakes: number, containedDigit: Digit | null): MistakeTracker {
  const capped = Math.min(mistakes, MAX_MISTAKES);
  return { mistakes: capped, locked: capped >= MAX_MISTAKES, containedDigit };
}

/**
 * Load a digit in digit-first mode, or clear the loaded digit with null.
 * Loading always ends containment — the rule holds only while one digit stays
 * loaded, so returning to a digit costs a fresh life.
 */
export function loadDigit(tracker: MistakeTracker, _loaded: Digit | 'erase' | null): MistakeTracker {
  return { ...tracker, containedDigit: null };
}

/** End containment because the player fixed the error the charge was for. */
export function releaseContainment(tracker: MistakeTracker): MistakeTracker {
  return { ...tracker, containedDigit: null };
}

/**
 * Record a wrong digit.
 *
 * In cell-first play every slip costs a life. In digit-first play the first
 * wrong placement of the loaded digit costs a life and the rest are free until
 * the digit changes or the error is corrected — without this, three fast taps
 * end a puzzle, a cliff that exists only because the mode is fast. Distinct
 * digits still cost distinct lives.
 */
export function recordWrongPlacement(
  tracker: MistakeTracker,
  { mode, digit }: { mode: InputMode; digit: Digit },
): MistakeTracker {
  if (tracker.locked) return tracker;

  if (mode === 'digitFirst') {
    if (tracker.containedDigit === digit) return tracker;
    return withMistakes(tracker, tracker.mistakes + 1, digit);
  }

  return withMistakes(tracker, tracker.mistakes + 1, null);
}
