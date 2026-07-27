import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apply, createSession, parseGrid } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { HOLD_MS, NumberPad } from '../src/components/NumberPad.js';

const PUZZLE =
  '53..7....' + '6..195...' + '.98....6.' + '8...6...3' + '4..8.3..1' +
  '7...2...6' + '.6....28.' + '...419..5' + '....8..79';
const SOLUTION =
  '534678912' + '672195348' + '198342567' + '859761423' + '426853791' +
  '713924856' + '961537284' + '287419635' + '345286179';

function session(overrides: Partial<Parameters<typeof createSession>[0]> = {}): SessionState {
  return createSession({
    givens: parseGrid(PUZZLE),
    solution: parseGrid(SOLUTION),
    ...overrides,
  });
}

function renderPad(initial: SessionState = session()) {
  let state = initial;
  const seen: Action[] = [];

  const view = render(<NumberPad session={state} onAction={() => undefined} />);

  function dispatch(action: Action) {
    seen.push(action);
    state = apply(state, action);
    view.rerender(<NumberPad session={state} onAction={dispatch} />);
  }

  view.rerender(<NumberPad session={state} onAction={dispatch} />);
  return { ...view, actions: seen, current: () => state };
}

function key(digit: number) {
  return screen.getByRole('button', { name: new RegExp(`^${digit}\\b`) });
}

/** Pointer gestures come from dispatchEvent, so React needs act() to flush. */
function pointer(el: Element, type: 'pointerdown' | 'pointerup' | 'pointercancel') {
  act(() => {
    el.dispatchEvent(new PointerEvent(type, { bubbles: true }));
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('layout and labels', () => {
  test('offers nine digits and an eraser', () => {
    renderPad();
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) expect(key(digit)).toBeDefined();
    expect(screen.getByRole('button', { name: /erase/i })).toBeDefined();
  });

  test('does not duplicate the toolbar — Notes lives there, not here', () => {
    renderPad();
    expect(screen.queryByRole('button', { name: /notes/i })).toBeNull();
  });

  test('each key announces how many of that digit are left', () => {
    renderPad();
    // The puzzle ships three 5s and two 4s among its givens.
    expect(key(5).getAttribute('aria-label')).toMatch(/6 remaining/i);
    expect(key(4).getAttribute('aria-label')).toMatch(/7 remaining/i);
  });

  test('the count falls as digits are placed', async () => {
    const user = userEvent.setup();
    const pad = renderPad(apply(session(), { type: 'selectCell', cell: 2 }));

    await user.click(key(4));
    expect(pad.current().grid[2]).toBe(4);
    expect(key(4).getAttribute('aria-label')).toMatch(/6 remaining/i);
  });
});

describe('a spent key', () => {
  /** Fill every empty cell that takes a 4, so no 4s remain. */
  function withDigitExhausted(): SessionState {
    let state = session();
    for (let cell = 0; cell < 81; cell += 1) {
      if (Number(SOLUTION[cell]) === 4 && state.grid[cell] === 0) {
        state = apply(state, { type: 'placeDigit', cell, digit: 4 });
      }
    }
    return state;
  }

  test('reads as zero remaining', () => {
    renderPad(withDigitExhausted());
    expect(key(4).getAttribute('aria-label')).toMatch(/none remaining/i);
  });

  test('is non-interactive', async () => {
    const user = userEvent.setup();
    const pad = renderPad(apply(withDigitExhausted(), { type: 'selectCell', cell: 2 }));

    expect(key(4).getAttribute('aria-disabled')).toBe('true');
    await user.click(key(4));
    expect(pad.actions.some((action) => action.type === 'placeDigit')).toBe(false);
  });

  test('carries a non-colour cue, not just reduced contrast', () => {
    renderPad(withDigitExhausted());
    // The 45-degree hatch. Without it the low-contrast --fg3 would be a real
    // AA failure rather than an exempt disabled state (DECISIONS.md NONET-5).
    expect(key(4).hasAttribute('data-spent')).toBe(true);
  });

  test('stays focusable so its count can still be read', () => {
    renderPad(withDigitExhausted());
    expect(key(4).getAttribute('tabindex')).not.toBe('-1');
  });
});

describe('cell-first', () => {
  test('a key places its digit in the selected cell', async () => {
    const user = userEvent.setup();
    const pad = renderPad(apply(session(), { type: 'selectCell', cell: 2 }));

    await user.click(key(4));
    expect(pad.current().grid[2]).toBe(4);
  });

  test('with nothing selected a key does nothing', async () => {
    const user = userEvent.setup();
    const pad = renderPad();

    await user.click(key(4));
    expect(pad.actions.some((action) => action.type === 'placeDigit')).toBe(false);
  });

  test('ERASE clears the selected cell', async () => {
    const user = userEvent.setup();
    let state = apply(session(), { type: 'selectCell', cell: 2 });
    state = apply(state, { type: 'placeDigit', cell: 2, digit: 4 });
    const pad = renderPad(state);

    await user.click(screen.getByRole('button', { name: /erase/i }));
    expect(pad.current().grid[2]).toBe(0);
  });
});

describe('digit-first', () => {
  test('a key loads its digit rather than placing it', async () => {
    const user = userEvent.setup();
    const pad = renderPad(session({ mode: 'digitFirst' }));

    await user.click(key(4));
    expect(pad.current().loadedDigit).toBe(4);
    expect(pad.current().grid.every((value, index) => value === pad.current().givens[index])).toBe(true);
  });

  test('ERASE loads the same way', async () => {
    const user = userEvent.setup();
    const pad = renderPad(session({ mode: 'digitFirst' }));

    await user.click(screen.getByRole('button', { name: /erase/i }));
    expect(pad.current().loadedDigit).toBe('erase');
  });

  test('the loaded key is marked as pressed', async () => {
    const user = userEvent.setup();
    renderPad(session({ mode: 'digitFirst' }));

    await user.click(key(4));
    expect(key(4).getAttribute('aria-pressed')).toBe('true');
    expect(key(5).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('long-press writes a note', () => {
  test('holding a key pencils that digit into the selected cell', async () => {
    vi.useFakeTimers();
    const pad = renderPad(apply(session(), { type: 'selectCell', cell: 2 }));

    pointer(key(4), 'pointerdown');
    await act(async () => { await vi.advanceTimersByTimeAsync(HOLD_MS + 50); });
    pointer(key(4), 'pointerup');

    expect(pad.current().grid[2]).toBe(0);
    expect(pad.current().notes[2]).not.toBe(0);
  });

  test('the hold arms visibly rather than firing silently', async () => {
    vi.useFakeTimers();
    renderPad(apply(session(), { type: 'selectCell', cell: 2 }));

    pointer(key(4), 'pointerdown');
    // Held but not yet armed: the key says so, and the count reads NOTE.
    expect(key(4).hasAttribute('data-held')).toBe(true);
    expect(key(4).hasAttribute('data-armed')).toBe(false);
    expect(key(4).textContent).toMatch(/NOTE/);

    await act(async () => { await vi.advanceTimersByTimeAsync(HOLD_MS + 50); });
    expect(key(4).hasAttribute('data-armed')).toBe(true);

    pointer(key(4), 'pointerup');
    expect(key(4).hasAttribute('data-held')).toBe(false);
  });

  test('a quick tap still places the digit', async () => {
    vi.useFakeTimers();
    const pad = renderPad(apply(session(), { type: 'selectCell', cell: 2 }));

    pointer(key(4), 'pointerdown');
    await act(async () => { await vi.advanceTimersByTimeAsync(80); });
    pointer(key(4), 'pointerup');

    expect(pad.current().grid[2]).toBe(4);
  });

  test('leaving the key before the threshold cancels the press', async () => {
    vi.useFakeTimers();
    const pad = renderPad(apply(session(), { type: 'selectCell', cell: 2 }));

    pointer(key(4), 'pointerdown');
    pointer(key(4), 'pointercancel');
    await act(async () => { await vi.advanceTimersByTimeAsync(HOLD_MS + 50); });

    expect(pad.current().notes[2]).toBe(0);
    expect(pad.current().grid[2]).toBe(0);
  });
});

describe('a locked board', () => {
  test('disables the whole pad', () => {
    let state = session();
    for (const cell of [2, 3, 5]) {
      const wrong = ((Number(SOLUTION[cell]) % 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      state = apply(state, { type: 'placeDigit', cell, digit: wrong });
    }
    renderPad(state);

    expect(screen.getByRole('group', { name: /number pad/i }).getAttribute('aria-disabled')).toBe('true');
  });
});
