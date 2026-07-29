import { describe, expect, test } from 'vitest';
import {
  MAX_MISTAKES,
  createMistakeTracker,
  loadDigit,
  recordWrongPlacement,
  releaseContainment,
} from '../src/rules/mistakes.ts';

/**
 * A cell to hang placements on where the cell is not what is under test.
 *
 * Cell-first containment is keyed on digit *and* cell, so anything asserting a
 * boundary between cells names its own — see `OTHER_CELL`.
 */
const CELL = 2;
const OTHER_CELL = 3;

describe('the tally', () => {
  test('starts empty and unlocked', () => {
    const tracker = createMistakeTracker();
    expect(tracker.mistakes).toBe(0);
    expect(tracker.locked).toBe(false);
  });

  test('locks the board at three', () => {
    expect(MAX_MISTAKES).toBe(3);

    let tracker = createMistakeTracker();
    for (const digit of [1, 2, 3] as const) {
      tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit, cell: CELL });
    }

    expect(tracker.mistakes).toBe(3);
    expect(tracker.locked).toBe(true);
  });

  test('never counts past the limit', () => {
    let tracker = createMistakeTracker();
    for (const digit of [1, 2, 3, 4, 5] as const) {
      tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit, cell: CELL });
    }
    expect(tracker.mistakes).toBe(MAX_MISTAKES);
  });
});

/**
 * Cell-first containment is pinned to the cell as well as the digit.
 *
 * The unit of intent in this mode is the cell — select one, commit a digit,
 * move on — so one misconception is one digit in one cell. Repeating it is
 * free; carrying the same wrong digit to a different cell is a second decision
 * and is charged (DECISIONS.md NONET-39).
 */
describe('cell-first containment', () => {
  test('repeating the same wrong digit in the same cell costs one life', () => {
    let tracker = createMistakeTracker();
    for (let i = 0; i < 5; i += 1) {
      tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    }

    expect(tracker.mistakes).toBe(1);
    expect(tracker.locked).toBe(false);
  });

  test('the same wrong digit in a different cell charges again', () => {
    let tracker = createMistakeTracker();
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: OTHER_CELL });

    expect(tracker.mistakes).toBe(2);
  });

  test('a different wrong digit in the same cell charges again', () => {
    let tracker = createMistakeTracker();
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 7, cell: CELL });

    expect(tracker.mistakes).toBe(2);
  });

  /**
   * Containment holds one pairing, not a history of them. Going back to a digit
   * this cell has already refused is a fresh decision, and the player has been
   * told the answer in between.
   */
  test('alternating two wrong digits in one cell charges each time', () => {
    let tracker = createMistakeTracker();
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 7, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });

    expect(tracker.mistakes).toBe(3);
    expect(tracker.locked).toBe(true);
  });

  test('correcting the error ends containment, so repeating it charges again', () => {
    let tracker = createMistakeTracker();
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });

    tracker = releaseContainment(tracker);
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });

    expect(tracker.mistakes).toBe(2);
  });

  /**
   * Three lives still mean three, and the board still has stakes: a player who
   * is wrong about three different things is out, exactly as before.
   */
  test('three distinct misconceptions still lock the board', () => {
    let tracker = createMistakeTracker();
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: OTHER_CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 7, cell: 4 });

    expect(tracker.mistakes).toBe(3);
    expect(tracker.locked).toBe(true);
  });
});

describe('digit-first containment', () => {
  test('repeated wrong placements of the loaded digit cost one mistake', () => {
    let tracker = createMistakeTracker();
    tracker = loadDigit(tracker, 5);

    for (let i = 0; i < 5; i += 1) {
      tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    }

    expect(tracker.mistakes).toBe(1);
    expect(tracker.locked).toBe(false);
  });

  test('three fast taps of one digit do not end the puzzle', () => {
    let tracker = loadDigit(createMistakeTracker(), 9);
    for (let i = 0; i < 3; i += 1) {
      tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 9, cell: CELL });
    }
    expect(tracker.locked).toBe(false);
  });

  test('distinct digits still cost distinct lives', () => {
    let tracker = createMistakeTracker();

    for (const digit of [5, 7, 9] as const) {
      tracker = loadDigit(tracker, digit);
      tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit, cell: CELL });
    }

    expect(tracker.mistakes).toBe(3);
    expect(tracker.locked).toBe(true);
  });

  test('changing digit and coming back charges again', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    tracker = loadDigit(tracker, 7);
    tracker = loadDigit(tracker, 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    expect(tracker.mistakes).toBe(2);
  });

  test('correcting the error ends containment, so the next slip charges', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    expect(tracker.mistakes).toBe(1);

    tracker = releaseContainment(tracker);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    expect(tracker.mistakes).toBe(2);
  });

  /**
   * Renamed rather than deleted when cell-first gained containment of its own
   * (NONET-39). The concern is unchanged — a sweep's allowance must not follow
   * the player into a mode that never granted it — but the boundary it proves
   * has moved from the mode to the cell.
   */
  test('a digit-first sweep does not excuse the same digit in cell-first play', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: OTHER_CELL });

    expect(tracker.mistakes).toBe(2);
  });

  /**
   * And it charges even in the cell the sweep just tried, because a digit-first
   * containment pins no cell at all — the allowance was for a gesture that
   * spans them. Changing mode is itself a change of intent, so the first slip
   * after it is charged and starts a containment of the new mode's shape.
   */
  test('crossing modes charges once, in the same cell as well', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5, cell: CELL });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    expect(tracker.mistakes).toBe(2);

    // ...and from there the cell-first rule applies as normal.
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5, cell: CELL });
    expect(tracker.mistakes).toBe(2);
  });
});
