import type { CellIndex, Digit } from '../types.ts';

/** Three strikes and the board locks. */
export const MAX_MISTAKES = 3;

export type InputMode = 'cellFirst' | 'digitFirst';

export interface MistakeTracker {
  readonly mistakes: number;
  readonly locked: boolean;
  /**
   * The digit currently under containment: it has already cost a life, and
   * further wrong placements of it are free until the containment ends.
   */
  readonly containedDigit: Digit | null;
  /**
   * The cell the containment is pinned to, in cell-first play only.
   *
   * `null` in digit-first, where containment deliberately spans every cell the
   * loaded digit is tried in. The two modes contain different things because
   * they are different gestures — see `recordWrongPlacement`.
   */
  readonly containedCell: CellIndex | null;
}

export function createMistakeTracker(): MistakeTracker {
  return { mistakes: 0, locked: false, containedDigit: null, containedCell: null };
}

function withMistakes(
  tracker: MistakeTracker,
  mistakes: number,
  containedDigit: Digit | null,
  containedCell: CellIndex | null,
): MistakeTracker {
  const capped = Math.min(mistakes, MAX_MISTAKES);
  return { mistakes: capped, locked: capped >= MAX_MISTAKES, containedDigit, containedCell };
}

/**
 * Load a digit in digit-first mode, load `ERASE`, or clear the cursor with
 * null.
 *
 * Loading ends containment, because the allowance holds only while one digit
 * stays loaded and returning to a digit is a fresh decision — **but re-tapping
 * the key that is already loaded is not returning to anything.** It is a
 * stutter: a second press of a key the player never left, expressing no change
 * of mind, and it used to silently re-arm the charge so the next slip with that
 * digit cost another life.
 *
 * `ERASE` and null still clear. Neither can equal a digit, and both are a
 * genuine change of tool — and erasing is how the error gets fixed, which ends
 * containment on its own path anyway.
 */
export function loadDigit(tracker: MistakeTracker, loaded: Digit | 'erase' | null): MistakeTracker {
  if (loaded !== null && loaded === tracker.containedDigit) return tracker;
  return { ...tracker, containedDigit: null, containedCell: null };
}

/** End containment because the player fixed the error the charge was for. */
export function releaseContainment(tracker: MistakeTracker): MistakeTracker {
  return { ...tracker, containedDigit: null, containedCell: null };
}

/**
 * Record a wrong digit.
 *
 * One misconception costs one life, in both modes — but the two modes contain
 * it differently, because **what counts as one misconception depends on the
 * gesture**, and the gestures are not the same.
 *
 * In **digit-first** the player loads a digit once and paints it across every
 * cell they believe takes it. That whole sweep is a single intent, so
 * containment spans cells: the first wrong placement of the loaded digit costs
 * a life and the rest are free until the digit changes or the error is
 * corrected. Without it, three fast taps end a puzzle — a cliff that exists
 * only because the mode is fast.
 *
 * In **cell-first** the unit of intent is the cell: the player selects one,
 * commits a digit, and moves on. Trying 6 in cell A and then 6 in cell B are
 * two separate decisions, and the second is charged. What is *not* charged is
 * pressing 6 into cell A again — checking the key registered, or repeating one
 * belief about one cell — which is the double charge this containment exists
 * to remove.
 *
 * Giving both modes the same keying would be the wrong kind of symmetry:
 * identical code across two different gestures produces two different
 * experiences (DECISIONS.md NONET-39).
 *
 * Distinct digits always cost distinct lives, in both modes.
 */
export function recordWrongPlacement(
  tracker: MistakeTracker,
  { mode, digit, cell }: { mode: InputMode; digit: Digit; cell: CellIndex },
): MistakeTracker {
  if (tracker.locked) return tracker;

  if (mode === 'digitFirst') {
    if (tracker.containedDigit === digit) return tracker;
    // No cell: the containment is the loaded digit, wherever it lands.
    return withMistakes(tracker, tracker.mistakes + 1, digit, null);
  }

  if (tracker.containedDigit === digit && tracker.containedCell === cell) return tracker;
  return withMistakes(tracker, tracker.mistakes + 1, digit, cell);
}
