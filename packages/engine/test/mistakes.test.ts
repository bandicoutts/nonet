import { describe, expect, test } from 'vitest';
import {
  MAX_MISTAKES,
  createMistakeTracker,
  loadDigit,
  recordWrongPlacement,
  releaseContainment,
} from '../src/rules/mistakes';

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
      tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit });
    }

    expect(tracker.mistakes).toBe(3);
    expect(tracker.locked).toBe(true);
  });

  test('never counts past the limit', () => {
    let tracker = createMistakeTracker();
    for (const digit of [1, 2, 3, 4, 5] as const) {
      tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit });
    }
    expect(tracker.mistakes).toBe(MAX_MISTAKES);
  });
});

describe('cell-first mode', () => {
  test('charges every wrong placement, even of the same digit', () => {
    let tracker = createMistakeTracker();
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5 });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5 });
    expect(tracker.mistakes).toBe(2);
  });
});

describe('digit-first containment', () => {
  test('repeated wrong placements of the loaded digit cost one mistake', () => {
    let tracker = createMistakeTracker();
    tracker = loadDigit(tracker, 5);

    for (let i = 0; i < 5; i += 1) {
      tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5 });
    }

    expect(tracker.mistakes).toBe(1);
    expect(tracker.locked).toBe(false);
  });

  test('three fast taps of one digit do not end the puzzle', () => {
    let tracker = loadDigit(createMistakeTracker(), 9);
    for (let i = 0; i < 3; i += 1) {
      tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 9 });
    }
    expect(tracker.locked).toBe(false);
  });

  test('distinct digits still cost distinct lives', () => {
    let tracker = createMistakeTracker();

    for (const digit of [5, 7, 9] as const) {
      tracker = loadDigit(tracker, digit);
      tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit });
    }

    expect(tracker.mistakes).toBe(3);
    expect(tracker.locked).toBe(true);
  });

  test('changing digit and coming back charges again', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5 });
    tracker = loadDigit(tracker, 7);
    tracker = loadDigit(tracker, 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5 });
    expect(tracker.mistakes).toBe(2);
  });

  test('correcting the error ends containment, so the next slip charges', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5 });
    expect(tracker.mistakes).toBe(1);

    tracker = releaseContainment(tracker);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5 });
    expect(tracker.mistakes).toBe(2);
  });

  test('containment does not leak into cell-first play', () => {
    let tracker = loadDigit(createMistakeTracker(), 5);
    tracker = recordWrongPlacement(tracker, { mode: 'digitFirst', digit: 5 });
    tracker = recordWrongPlacement(tracker, { mode: 'cellFirst', digit: 5 });
    expect(tracker.mistakes).toBe(2);
  });
});
