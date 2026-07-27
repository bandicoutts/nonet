import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordScreen } from '@/components/RecordScreen';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

const AT = new Date('2026-07-27T09:00:00.000Z');
const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 1 };

function solve(over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref: DAILY,
    solvedAt: '2026-07-27T09:00:00.000Z',
    localDate: '2026-07-27',
    durationMs: 300_000,
    mistakes: 0,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
    ...over,
  };
}

function seed(...solves: GuestSolve[]): void {
  window.localStorage.setItem('nonet:solves', JSON.stringify(solves));
}

const show = () => render(<RecordScreen now={AT} />);

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('RecordScreen', () => {
  it('invites a player with no history rather than showing empty figures', () => {
    show();

    expect(screen.getByText('No record yet.')).toBeDefined();
    expect(screen.getByRole('link', { name: /Go to today/ })).toBeDefined();
    expect(screen.queryByText('Current streak')).toBeNull();
  });

  it('spells the run in the headline', () => {
    seed(solve());
    show();

    expect(screen.getByText(/One days, unbroken/)).toBeDefined();
  });

  it('shows the four figures', () => {
    seed(solve());
    show();

    for (const label of ['Current streak', 'Best streak', 'Dailies solved', 'Mistake-free']) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getByText('100%')).toBeDefined();
  });

  /* The window tabs change the figures, not just their styling. */
  it('narrows to the last thirty days', async () => {
    seed(
      solve(),
      solve({ localDate: '2026-01-01', solvedAt: '2026-01-01T09:00:00.000Z', ref: { ...DAILY, seed: 2 } }),
    );
    const { container } = show();

    /* Scoped to the Dailies-solved figure: bare digits appear in the tables
       too, so a document-wide text query is ambiguous. */
    const solved = () =>
      [...container.querySelectorAll('dt')]
        .find((dt) => dt.textContent === 'Dailies solved')
        ?.parentElement?.querySelector('dd')?.textContent;

    expect(solved()).toBe('2');
    await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(solved()).toBe('1');
  });

  it('tells a guest the figures are local', () => {
    seed(solve());
    show();
    expect(screen.getByText(/stored in this browser only/)).toBeDefined();
  });

  it('reports the bands, including ones never played', () => {
    seed(solve());
    show();

    expect(screen.getByText('Dailies by difficulty — all time')).toBeDefined();
    // Four bands in each of the two tables.
    expect(screen.getAllByText('Expert')).toHaveLength(2);
  });

  /*
   * Both figures the data cannot honestly supply. Neither is invented: the
   * assisted share replaces a per-puzzle hint count that is not stored, and the
   * strip summary omits failures because nothing records a failed day.
   */
  it('reports the assisted share rather than a hint count', () => {
    seed(solve({ usedHint: true }));
    show();

    expect(screen.getByText(/Assisted solves, all time — 100%/)).toBeDefined();
    expect(screen.queryByText(/per puzzle/)).toBeNull();
  });

  it('summarises the year without claiming failures', () => {
    seed(solve());
    show();

    expect(screen.getByText(/1 solved · 0 unplayed/)).toBeDefined();
    expect(screen.queryByText(/failed/)).toBeNull();
  });

  it('draws a cell for every day of the year', () => {
    seed(solve());
    const { container } = show();

    expect(container.querySelectorAll('[role="img"] > span')).toHaveLength(365);
  });
});
