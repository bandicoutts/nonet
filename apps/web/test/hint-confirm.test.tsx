import { useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apply, createSession, parseGrid } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { BoardLayout } from '@/components/BoardLayout';
import { createElapsedClock } from '@/lib/elapsed';

/**
 * The first hint per puzzle confirms — **whichever way it is asked for.**
 *
 * A hint is irreversible and forfeits the percentile, so the design confirms it
 * once. That rule used to live inside `BoardToolbar`, which meant the chip
 * confirmed and the board's `H` key did not: one unconfirmed keystroke spent
 * the thing the dialog exists to protect. It lives above both callers now, and
 * these tests exercise both paths against the same rule so they cannot drift
 * apart again.
 */
const PUZZLE =
  '53..7....' + '6..195...' + '.98....6.' + '8...6...3' + '4..8.3..1' +
  '7...2...6' + '.6....28.' + '...419..5' + '....8..79';
const SOLUTION =
  '534678912' + '672195348' + '198342567' + '859761423' + '426853791' +
  '713924856' + '961537284' + '287419635' + '345286179';

function setup(initial?: SessionState) {
  const actions: Action[] = [];
  const onConfirmHint = vi.fn();

  function Host() {
    const [session, setSession] = useState<SessionState>(
      () => initial ?? createSession({ givens: parseGrid(PUZZLE), solution: parseGrid(SOLUTION) }),
    );
    const onAction = useCallback((action: Action) => {
      actions.push(action);
      setSession((s) => apply(s, action));
    }, []);

    return (
      <BoardLayout
        session={session}
        onAction={onAction}
        clock={createElapsedClock()}
        paused={false}
        onPause={() => undefined}
        onResume={() => undefined}
        onConfirmHint={onConfirmHint}
        onToggleMode={() => undefined}
        back={null}
      />
    );
  }

  render(<Host />);
  return { actions, onConfirmHint };
}

const fresh = () => createSession({ givens: parseGrid(PUZZLE), solution: parseGrid(SOLUTION) });
const afterOneHint = () => apply(fresh(), { type: 'hint' });
const spent = () => {
  let state = fresh();
  for (let i = 0; i < 3; i += 1) state = apply(state, { type: 'hint' });
  return state;
};

/** The grid handles the key, so it has to be typed into a cell. */
async function pressH(user: ReturnType<typeof userEvent.setup>) {
  const cell = screen.getAllByRole('gridcell')[0]!;
  cell.focus();
  await user.keyboard('h');
}

afterEach(cleanup);

describe('asking for the first hint', () => {
  it('confirms when the chip is clicked', async () => {
    const user = userEvent.setup();
    const { actions, onConfirmHint } = setup();

    await user.click(screen.getByRole('button', { name: /hint/i }));

    expect(onConfirmHint).toHaveBeenCalledOnce();
    expect(actions).not.toContainEqual({ type: 'hint' });
  });

  it('confirms when H is pressed, rather than spending it outright', async () => {
    const user = userEvent.setup();
    const { actions, onConfirmHint } = setup();

    await pressH(user);

    expect(onConfirmHint).toHaveBeenCalledOnce();
    expect(actions).not.toContainEqual({ type: 'hint' });
  });
});

describe('asking for a later hint', () => {
  it('goes straight through from the chip — the cost is already accepted', async () => {
    const user = userEvent.setup();
    const { actions, onConfirmHint } = setup(afterOneHint());

    await user.click(screen.getByRole('button', { name: /hint/i }));

    expect(onConfirmHint).not.toHaveBeenCalled();
    expect(actions).toContainEqual({ type: 'hint' });
  });

  it('goes straight through from H as well', async () => {
    const user = userEvent.setup();
    const { actions, onConfirmHint } = setup(afterOneHint());

    await pressH(user);

    expect(onConfirmHint).not.toHaveBeenCalled();
    expect(actions).toContainEqual({ type: 'hint' });
  });
});

describe('when there are no hints left', () => {
  it('does nothing from either the chip or the key', async () => {
    const user = userEvent.setup();
    const { actions, onConfirmHint } = setup(spent());

    await user.click(screen.getByRole('button', { name: /hint/i }));
    await pressH(user);

    expect(onConfirmHint).not.toHaveBeenCalled();
    expect(actions).not.toContainEqual({ type: 'hint' });
  });
});
