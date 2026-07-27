import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dailyDifficulty, dailySeed } from '@nonet/engine';
import { ArchiveScreen } from '@/components/ArchiveScreen';
import type { GuestSolve } from '@/lib/storage';

/** A fortnight after the epoch, so August has editions and July has five. */
const AT = new Date('2026-08-10T09:00:00.000Z');

function solveOf(date: string): GuestSolve {
  return {
    ref: { kind: 'daily', difficulty: dailyDifficulty(date), seed: dailySeed(date) },
    solvedAt: `${date}T09:00:00.000Z`,
    localDate: date,
    durationMs: 300_000,
    mistakes: 0,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
  };
}

function seed(...solves: GuestSolve[]): void {
  window.localStorage.setItem('nonet:solves', JSON.stringify(solves));
}

const show = () => render(<ArchiveScreen now={AT} />);

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('ArchiveScreen', () => {
  it('opens on the current month', () => {
    show();
    expect(screen.getByText('August 2026')).toBeDefined();
  });

  it('lists only editions that exist', () => {
    show();
    // 1-10 August are playable; the rest of the month is still to come.
    expect(screen.getByText(/10 of 10 in August/)).toBeDefined();
  });

  it('walks back to an earlier month', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Earlier month' }));

    expect(screen.getByText('July 2026')).toBeDefined();
    // The epoch is 27 July, so July holds five editions.
    expect(screen.getByText(/5 of 5 in July/)).toBeDefined();
  });

  it('links an edition to its board', () => {
    show();
    const link = screen.getByRole('link', { name: /No\. 6/ });

    expect(link.getAttribute('href')).toContain('kind=daily');
    expect(link.getAttribute('href')).toContain(`seed=${dailySeed('2026-08-01')}`);
  });

  it('shows a time for a solved edition and a dash otherwise', () => {
    seed(solveOf('2026-08-01'));
    show();

    expect(screen.getByText('05:00')).toBeDefined();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('narrows by status', async () => {
    seed(solveOf('2026-08-01'));
    show();

    await userEvent.click(screen.getByRole('button', { name: 'Solved' }));
    expect(screen.getByText(/1 of 10 in August/)).toBeDefined();
  });

  it('clears the filters again', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Solved' }));
    await userEvent.click(screen.getByRole('button', { name: /Clear all/ }));

    expect(screen.getByText(/10 of 10 in August/)).toBeDefined();
  });

  it('says so when nothing matches', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Solved' }));

    expect(screen.getByText(/Nothing in this month matches the filter/)).toBeDefined();
  });

  /* Failures are recorded now, so the filter copy.md asks for works (NONET-27). */
  it('narrows to failed editions', async () => {
    window.localStorage.setItem(
      `nonet:attempt:daily:${dailyDifficulty('2026-08-03')}:${dailySeed('2026-08-03')}`,
      JSON.stringify({ attempts: 2, localDate: '2026-08-03' }),
    );
    show();

    await userEvent.click(screen.getByRole('button', { name: 'Failed' }));
    expect(screen.getByText(/1 of 10 in August/)).toBeDefined();
  });
});
