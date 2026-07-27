import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSession, parseGrid, apply } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { Board } from '../src/components/Board.js';

/** Row 0 is `53..7....`, so cells 2, 3, 5, 6, 7, 8 start empty. */
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

/** Render a board that actually reduces actions, so interaction is end to end. */
function renderBoard(initial: SessionState = session()) {
  let state = initial;
  const seen: Action[] = [];

  const view = render(<Board session={state} onAction={() => undefined} />);

  const rerenderWith = (next: SessionState) => {
    state = next;
    view.rerender(<Board session={state} onAction={dispatch} />);
  };

  function dispatch(action: Action) {
    seen.push(action);
    rerenderWith(apply(state, action));
  }

  view.rerender(<Board session={state} onAction={dispatch} />);

  return { ...view, actions: seen, current: () => state };
}

describe('grid semantics', () => {
  test('is a grid with an accessible name', () => {
    renderBoard();
    expect(screen.getByRole('grid', { name: /sudoku/i })).toBeDefined();
  });

  test('has nine rows of nine cells', () => {
    renderBoard();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      expect(within(row).getAllByRole('gridcell')).toHaveLength(9);
    }
  });

  test('every cell announces its position', () => {
    renderBoard();
    expect(screen.getByRole('gridcell', { name: /row 1, column 1/i })).toBeDefined();
    expect(screen.getByRole('gridcell', { name: /row 9, column 9/i })).toBeDefined();
  });

  test('a given announces its digit and that it cannot be changed', () => {
    renderBoard();
    const cell = screen.getByRole('gridcell', { name: /row 1, column 1/i });
    expect(cell.getAttribute('aria-label')).toMatch(/5/);
    expect(cell.getAttribute('aria-label')).toMatch(/given/i);
    expect(cell.getAttribute('aria-readonly')).toBe('true');
  });

  test('an empty cell says so', () => {
    renderBoard();
    expect(
      screen.getByRole('gridcell', { name: /row 1, column 3/i }).getAttribute('aria-label'),
    ).toMatch(/empty/i);
  });

  test('a player entry is not marked read-only', () => {
    renderBoard();
    expect(
      screen.getByRole('gridcell', { name: /row 1, column 3/i }).getAttribute('aria-readonly'),
    ).not.toBe('true');
  });
});

describe('roving tabindex', () => {
  test('exactly one cell is in the tab order', () => {
    renderBoard();
    const focusable = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('tabindex') === '0');
    expect(focusable).toHaveLength(1);
  });

  test('the tab stop follows the selection', async () => {
    const user = userEvent.setup();
    renderBoard(apply(session(), { type: 'selectCell', cell: 40 }));

    const selected = screen.getByRole('gridcell', { name: /row 5, column 5/i });
    expect(selected.getAttribute('tabindex')).toBe('0');

    await user.tab();
    expect(document.activeElement).toBe(selected);
  });
});

describe('keyboard navigation', () => {
  test('arrows move the selection', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 40 }));

    screen.getByRole('gridcell', { name: /row 5, column 5/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(board.current().selected).toBe(41);

    await user.keyboard('{ArrowDown}');
    expect(board.current().selected).toBe(50);

    await user.keyboard('{ArrowLeft}');
    expect(board.current().selected).toBe(49);

    await user.keyboard('{ArrowUp}');
    expect(board.current().selected).toBe(40);
  });

  test('the selection stops at the edges rather than wrapping', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 0 }));

    screen.getByRole('gridcell', { name: /row 1, column 1/i }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(board.current().selected).toBe(0);

    await user.keyboard('{ArrowUp}');
    expect(board.current().selected).toBe(0);
  });

  test('focus follows the selection as it moves', async () => {
    const user = userEvent.setup();
    renderBoard(apply(session(), { type: 'selectCell', cell: 0 }));

    screen.getByRole('gridcell', { name: /row 1, column 1/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('gridcell', { name: /row 1, column 2/i }),
    );
  });

  test('clicking a cell selects it', async () => {
    const user = userEvent.setup();
    const board = renderBoard();

    await user.click(screen.getByRole('gridcell', { name: /row 1, column 3/i }));
    expect(board.current().selected).toBe(2);
  });
});

describe('entering digits', () => {
  test('a number key places a digit in the selected cell', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('4');

    expect(board.current().grid[2]).toBe(4);
  });

  test('shift and a number writes a note instead', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('{Shift>}4{/Shift}');

    expect(board.current().grid[2]).toBe(0);
    expect(board.current().notes[2]).not.toBe(0);
  });

  test('a wrong digit is announced as incorrect', async () => {
    const user = userEvent.setup();
    renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('9');

    const cell = screen.getByRole('gridcell', { name: /row 1, column 3/i });
    expect(cell.getAttribute('aria-invalid')).toBe('true');
    expect(cell.getAttribute('aria-label')).toMatch(/incorrect/i);
  });

  test('backspace erases', async () => {
    const user = userEvent.setup();
    let state = apply(session(), { type: 'selectCell', cell: 2 });
    state = apply(state, { type: 'placeDigit', cell: 2, digit: 4 });
    const board = renderBoard(state);

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('{Backspace}');

    expect(board.current().grid[2]).toBe(0);
  });

  test('givens ignore digit entry', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 0 }));

    screen.getByRole('gridcell', { name: /row 1, column 1/i }).focus();
    await user.keyboard('9');

    expect(board.current().grid[0]).toBe(5);
  });

  test('notes are announced', async () => {
    const user = userEvent.setup();
    renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('{Shift>}1{/Shift}');
    await user.keyboard('{Shift>}4{/Shift}');

    expect(
      screen.getByRole('gridcell', { name: /row 1, column 3/i }).getAttribute('aria-label'),
    ).toMatch(/notes 1, 4/i);
  });
});

describe('modes and history', () => {
  test('space toggles notes mode, so a plain digit becomes a note', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard(' ');
    expect(board.current().notesMode).toBe(true);

    await user.keyboard('4');
    expect(board.current().grid[2]).toBe(0);
    expect(board.current().notes[2]).not.toBe(0);
  });

  test('ctrl+z undoes and ctrl+shift+z redoes', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('4');
    expect(board.current().grid[2]).toBe(4);

    await user.keyboard('{Control>}z{/Control}');
    expect(board.current().grid[2]).toBe(0);

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(board.current().grid[2]).toBe(4);
  });

  test('undo does not give back a spent life', async () => {
    const user = userEvent.setup();
    const board = renderBoard(apply(session(), { type: 'selectCell', cell: 2 }));

    screen.getByRole('gridcell', { name: /row 1, column 3/i }).focus();
    await user.keyboard('9');
    expect(board.current().mistakes).toBe(1);

    await user.keyboard('{Control>}z{/Control}');
    expect(board.current().mistakes).toBe(1);
  });

  test('h asks for a hint', async () => {
    const user = userEvent.setup();
    const board = renderBoard();

    screen.getByRole('gridcell', { name: /row 1, column 1/i }).focus();
    await user.keyboard('h');

    expect(board.actions).toContainEqual({ type: 'hint' });
  });

  test('p asks to pause, which the board does not own', async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    render(<Board session={session()} onAction={() => undefined} onPause={onPause} />);

    screen.getByRole('gridcell', { name: /row 1, column 1/i }).focus();
    await user.keyboard('p');

    expect(onPause).toHaveBeenCalledOnce();
  });
});

describe('a locked board', () => {
  test('refuses digits once three mistakes are spent', async () => {
    const user = userEvent.setup();
    let state = session();
    for (const cell of [2, 3, 5]) {
      const wrong = ((Number(SOLUTION[cell]) % 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      state = apply(state, { type: 'placeDigit', cell, digit: wrong });
    }
    const board = renderBoard(apply(state, { type: 'selectCell', cell: 6 }));

    expect(board.current().status).toBe('failed');
    screen.getByRole('gridcell', { name: /row 1, column 7/i }).focus();
    await user.keyboard('9');

    expect(board.current().grid[6]).toBe(0);
  });

  test('is announced as unavailable', () => {
    let state = session();
    for (const cell of [2, 3, 5]) {
      const wrong = ((Number(SOLUTION[cell]) % 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      state = apply(state, { type: 'placeDigit', cell, digit: wrong });
    }
    renderBoard(state);

    expect(screen.getByRole('grid').getAttribute('aria-disabled')).toBe('true');
  });
});
