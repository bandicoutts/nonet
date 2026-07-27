import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apply, createSession, parseGrid } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { BoardToolbar, formatTime } from '../src/components/BoardToolbar';
import { PauseVeil } from '../src/components/PauseVeil';

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

function renderToolbar(initial: SessionState = session(), elapsedMs = 0) {
  let state = initial;
  const seen: Action[] = [];
  const onPause = vi.fn();
  const onConfirmHint = vi.fn();

  const view = render(
    <BoardToolbar
      session={state}
      onAction={() => undefined}
      onPause={onPause}
      onConfirmHint={onConfirmHint}
      elapsedMs={elapsedMs}
    />,
  );

  function dispatch(action: Action) {
    seen.push(action);
    state = apply(state, action);
    view.rerender(
      <BoardToolbar
        session={state}
        onAction={dispatch}
        onPause={onPause}
        onConfirmHint={onConfirmHint}
        elapsedMs={elapsedMs}
      />,
    );
  }

  view.rerender(
    <BoardToolbar
      session={state}
      onAction={dispatch}
      onPause={onPause}
      onConfirmHint={onConfirmHint}
      elapsedMs={elapsedMs}
    />,
  );

  return { ...view, actions: seen, onPause, onConfirmHint, current: () => state };
}

const chip = (name: RegExp) => screen.getByRole('button', { name });

describe('formatTime', () => {
  test('reads as minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(7_000)).toBe('0:07');
    expect(formatTime(432_000)).toBe('7:12');
  });

  test('caps at 99:59+ so a long session cannot break the layout', () => {
    expect(formatTime(100 * 60 * 1000)).toBe('99:59+');
  });
});

describe('status', () => {
  test('announces the elapsed time', () => {
    renderToolbar(session(), 432_000);
    expect(screen.getByLabelText(/elapsed time 7:12/i)).toBeDefined();
  });

  test('announces the mistake tally as a count, not just dots', () => {
    renderToolbar(apply(session(), { type: 'placeDigit', cell: 2, digit: 9 }));
    expect(screen.getByLabelText(/1 of 3 mistakes/i)).toBeDefined();
  });

  test('hides the tally entirely when checking is off', () => {
    renderToolbar(session({ checking: false }));
    expect(screen.queryByLabelText(/of 3 mistakes/i)).toBeNull();
  });
});

describe('controls', () => {
  test('offers the six board controls', () => {
    renderToolbar();
    for (const name of [/notes/i, /undo/i, /redo/i, /erase/i, /hint/i, /pause/i]) {
      expect(chip(name)).toBeDefined();
    }
  });

  test('notes toggles and reports its state', async () => {
    const user = userEvent.setup();
    const toolbar = renderToolbar();

    await user.click(chip(/notes/i));
    expect(toolbar.current().notesMode).toBe(true);
    expect(chip(/notes/i).getAttribute('aria-pressed')).toBe('true');
  });

  test('undo is unavailable until there is something to undo', async () => {
    const user = userEvent.setup();
    const toolbar = renderToolbar();

    expect(chip(/undo/i).getAttribute('aria-disabled')).toBe('true');
    await user.click(chip(/undo/i));
    expect(toolbar.actions).toHaveLength(0);
  });

  test('undo becomes available after a move', () => {
    renderToolbar(apply(session(), { type: 'placeDigit', cell: 2, digit: 4 }));
    expect(chip(/undo/i).getAttribute('aria-disabled')).not.toBe('true');
  });

  test('pause is forwarded rather than handled', async () => {
    const user = userEvent.setup();
    const toolbar = renderToolbar();

    await user.click(chip(/pause/i));
    expect(toolbar.onPause).toHaveBeenCalledOnce();
  });
});

describe('hints', () => {
  test('the chip carries how many are left', () => {
    renderToolbar();
    expect(chip(/hint, 3 of 3 left/i)).toBeDefined();
  });

  test('the first hint asks for confirmation instead of firing', async () => {
    const user = userEvent.setup();
    const toolbar = renderToolbar();

    await user.click(chip(/hint/i));
    expect(toolbar.onConfirmHint).toHaveBeenCalledOnce();
    expect(toolbar.actions).toHaveLength(0);
  });

  test('later hints go straight through', async () => {
    const user = userEvent.setup();
    const toolbar = renderToolbar(apply(session(), { type: 'hint' }));

    await user.click(chip(/hint/i));
    expect(toolbar.onConfirmHint).not.toHaveBeenCalled();
    expect(toolbar.actions).toContainEqual({ type: 'hint' });
  });

  test('runs out at three and stays reachable to say so', async () => {
    const user = userEvent.setup();
    let state = session();
    for (let i = 0; i < 3; i += 1) state = apply(state, { type: 'hint' });
    const toolbar = renderToolbar(state);

    const hint = chip(/hint, 0 of 3 left/i);
    expect(hint.getAttribute('aria-disabled')).toBe('true');
    // aria-disabled, not disabled: still focusable, so the count can be heard.
    expect(hint.hasAttribute('disabled')).toBe(false);

    await user.click(hint);
    expect(toolbar.actions).toHaveLength(0);
  });
});

describe('a locked board', () => {
  function locked(): SessionState {
    let state = session();
    for (const cell of [2, 3, 5]) {
      const wrong = ((Number(SOLUTION[cell]) % 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      state = apply(state, { type: 'placeDigit', cell, digit: wrong });
    }
    return state;
  }

  test('disables every control', () => {
    renderToolbar(locked());
    for (const name of [/notes/i, /undo/i, /redo/i, /erase/i, /hint/i, /pause/i]) {
      expect(chip(name).getAttribute('aria-disabled'), String(name)).toBe('true');
    }
  });
});

describe('PauseVeil', () => {
  test('is a modal dialog, so the board beneath is out of reach', () => {
    render(<PauseVeil reason="paused" onResume={() => undefined} />);
    const veil = screen.getByRole('dialog', { name: /paused/i });
    expect(veil.getAttribute('aria-modal')).toBe('true');
  });

  test('takes focus so a keyboard player is not stranded behind it', () => {
    render(<PauseVeil reason="paused" onResume={() => undefined} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /resume/i }));
  });

  test('resumes on click and on Escape', async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(<PauseVeil reason="paused" onResume={onResume} />);

    await user.click(screen.getByRole('button', { name: /resume/i }));
    expect(onResume).toHaveBeenCalledOnce();

    await user.keyboard('{Escape}');
    expect(onResume).toHaveBeenCalledTimes(2);
  });

  test('a locked board offers a retry, not a resume', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<PauseVeil reason="locked" onRetry={onRetry} />);

    expect(screen.getByRole('dialog', { name: /locked/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /resume/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /start again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test('Escape does not dismiss a locked board — there is nothing to resume to', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<PauseVeil reason="locked" onRetry={onRetry} />);

    await user.keyboard('{Escape}');
    expect(onRetry).not.toHaveBeenCalled();
  });

  /**
   * Copy is verbatim from `design/export/copy.md`. The Phase 2 build invented
   * its own strings, which read fine and were not the design's.
   */
  test('names the time it was paused at', () => {
    render(<PauseVeil reason="paused" elapsedMs={432_000} onResume={() => undefined} />);
    expect(screen.getByText(/paused at 7:12/i)).toBeDefined();
  });

  test('says what actually happened when the board locks', () => {
    render(<PauseVeil reason="locked" onRetry={() => undefined} />);
    expect(screen.getByText(/three mistakes — locked/i)).toBeDefined();
  });

  /**
   * Retry is allowed once and there is no third. With it spent, the veil keeps
   * its message and loses its action rather than offering a control that would
   * do nothing (GAME-RULES.md).
   */
  test('offers no action once both attempts are spent', () => {
    render(<PauseVeil reason="locked" />);

    expect(screen.getByRole('dialog', { name: /locked/i })).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/both attempts are spent/i)).toBeDefined();
  });
});
