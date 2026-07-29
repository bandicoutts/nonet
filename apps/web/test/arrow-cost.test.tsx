import { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apply, createSession, parseGrid } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { Board } from '@/components/Board';
import { BoardScreen } from '@/components/BoardScreen';
import type { PuzzleRef } from '@/lib/storage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

/**
 * What one arrow press costs.
 *
 * An arrow press used to produce two state commits. The key moves the
 * selection; the board then moves DOM focus to follow it, and the newly focused
 * cell reports a selection that is already true. The reducer returned a new
 * object for that second, identical dispatch, so it looked like a change to
 * everything downstream — a render pass, and a second write of the whole grid
 * and notes to localStorage, for a move that changed nothing.
 *
 * Both are asserted here rather than described, because both are invisible on
 * screen and neither would be noticed again until someone profiled it.
 */
const PUZZLE =
  '53..7....' + '6..195...' + '.98....6.' + '8...6...3' + '4..8.3..1' +
  '7...2...6' + '.6....28.' + '...419..5' + '....8..79';
const SOLUTION =
  '534678912' + '672195348' + '198342567' + '859761423' + '426853791' +
  '713924856' + '961537284' + '287419635' + '345286179';

const REF: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 4242 };

/** Every distinct session object the board has committed. */
const committed: SessionState[] = [];

function Host() {
  const [session, setSession] = useState<SessionState>(() =>
    createSession({ givens: parseGrid(PUZZLE), solution: parseGrid(SOLUTION) }),
  );
  const onAction = useCallback((action: Action) => setSession((s) => apply(s, action)), []);

  if (committed[committed.length - 1] !== session) committed.push(session);

  return <Board session={session} onAction={onAction} />;
}

const cellByIndex = (i: number) =>
  screen.getByRole('gridcell', {
    name: new RegExp(`^Row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1},`),
  });

function recordAutosaveWrites(): string[] {
  const writes: string[] = [];
  const real = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (key.startsWith('nonet:autosave')) writes.push(value);
    real.call(this, key, value);
  });
  return writes;
}

beforeEach(() => {
  window.localStorage.clear();
  committed.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('one arrow press', () => {
  it('commits exactly one new session', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(cellByIndex(0));
    const before = committed.length;

    await user.keyboard('{ArrowRight}');

    expect(committed.length - before).toBe(1);
    expect(committed[committed.length - 1]?.selected).toBe(1);
  });

  it('writes the autosave exactly once', async () => {
    const user = userEvent.setup();
    const writes = recordAutosaveWrites();

    render(<BoardScreen puzzleRef={REF} />);
    await act(async () => {
      await Promise.resolve();
    });

    const firstEmpty = screen
      .getAllByRole('gridcell')
      .findIndex((c) => !c.hasAttribute('data-given'));
    await user.click(cellByIndex(firstEmpty));

    writes.length = 0;
    await user.keyboard('{ArrowRight}');

    expect(writes).toHaveLength(1);
  });

  /**
   * The saving itself stays unconditional.
   *
   * The redundant write is gone because the state is genuinely identical, not
   * because the autosave learned which fields are worth persisting. A rule like
   * that would have to be reapplied to every field added later, and getting it
   * wrong loses a player's board silently.
   */
  it('still writes when the move actually changes the board', async () => {
    const user = userEvent.setup();
    const writes = recordAutosaveWrites();

    render(<BoardScreen puzzleRef={REF} />);
    await act(async () => {
      await Promise.resolve();
    });

    const firstEmpty = screen
      .getAllByRole('gridcell')
      .findIndex((c) => !c.hasAttribute('data-given'));
    await user.click(cellByIndex(firstEmpty));

    writes.length = 0;
    await user.keyboard('5');

    expect(writes.length).toBeGreaterThan(0);
  });
});
