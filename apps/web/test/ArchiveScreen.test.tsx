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

/**
 * Find a month control by its **glyph**, not its accessible name.
 *
 * The two were inverted — `→` carried the label "Earlier month" — and every
 * name-based query passed throughout, because the label was accurate for the
 * behaviour and wrong for the arrow. Selecting on the glyph is what makes the
 * direction testable.
 */
function arrow(glyph: '←' | '→'): HTMLElement {
  return screen.getByText(glyph).closest('button') as HTMLElement;
}

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

  /*
   * The arrows point the way a calendar points, and the assertion is on the
   * glyph rather than the label for a reason: these were inverted, and both the
   * unit test and the a11y scan passed throughout because they select by
   * accessible name. A correct label on a backwards arrow is exactly the bug
   * that hides from a name-based query.
   */
  it('walks back in time with the left arrow', async () => {
    show();
    await userEvent.click(arrow('←'));

    expect(screen.getByText('July 2026')).toBeDefined();
    // A full month, now that the epoch is the start of the year (NONET-31).
    expect(screen.getByText(/31 of 31 in July/)).toBeDefined();
  });

  it('walks forward in time with the right arrow', async () => {
    show();
    await userEvent.click(arrow('←'));
    expect(screen.getByText('July 2026')).toBeDefined();

    await userEvent.click(arrow('→'));
    expect(screen.getByText('August 2026')).toBeDefined();
  });

  /* There is no month after the current edition, and none before the epoch. */
  it('stops at both ends', async () => {
    show();
    expect(arrow('→').getAttribute('aria-disabled')).toBe('true');
    // And the labels match the direction the glyphs point.
    expect(arrow('←').getAttribute('aria-label')).toBe('Earlier month');
    expect(arrow('→').getAttribute('aria-label')).toBe('Later month');

    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(arrow('←'));
    }
    expect(screen.getByText('January 2026')).toBeDefined();
    expect(arrow('←').getAttribute('aria-disabled')).toBe('true');
  });

  it('links an edition to its board', () => {
    show();
    // 1 August 2026 is No. 213.
    const link = screen.getByRole('link', { name: /No\. 213/ });

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
