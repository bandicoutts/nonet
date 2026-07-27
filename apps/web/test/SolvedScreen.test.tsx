import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SolvedScreen } from '@/components/SolvedScreen';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'hard', seed: 4242 };

function solve(over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref: DAILY,
    solvedAt: '2026-07-27T09:14:00.000Z',
    localDate: '2026-07-27',
    durationMs: 432_000,
    mistakes: 1,
    usedHint: false,
    attempt: 1,
    checked: true,
    kind: 'daily',
    ...over,
  };
}

function seedSolves(...solves: GuestSolve[]): void {
  window.localStorage.setItem('nonet:solves', JSON.stringify(solves));
}

const onLeave = vi.fn();

function renderScreen(ref: PuzzleRef = DAILY, percentile: number | null = 22) {
  return render(
    <SolvedScreen
      puzzleRef={ref}
      onLeave={onLeave}
      getPercentile={async () => percentile}
      now={new Date('2026-07-27T09:43:00.000Z')}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  onLeave.mockClear();
});

afterEach(cleanup);

describe('SolvedScreen', () => {
  /* The time appears twice by design: the headline, and the Time stat. */
  it('states the time it was solved in', () => {
    seedSolves(solve());
    renderScreen();

    expect(screen.getByText('Solved in')).toBeDefined();
    expect(screen.getAllByText('07:12')).toHaveLength(2);
  });

  it('names the edition and the date', () => {
    seedSolves(solve());
    renderScreen();

    // The epoch is 1 January 2026, so 27 July is No. 208 (NONET-31).
    expect(screen.getByText('No. 208 · 27 July 2026')).toBeDefined();
    expect(screen.getAllByText(/27 July 2026/).length).toBeGreaterThan(0);
  });

  it('reports the run it extended', () => {
    seedSolves(solve({ localDate: '2026-07-26' }), solve());
    renderScreen();

    expect(screen.getByText('Run extended')).toBeDefined();
    expect(screen.getByText('1 → 2')).toBeDefined();
    expect(screen.getByText(/Longest run 2/)).toBeDefined();
  });

  it('shows the four stats, ending in the percentile', () => {
    seedSolves(solve());
    renderScreen();

    expect(screen.getByText('Time')).toBeDefined();
    expect(screen.getByText('Difficulty')).toBeDefined();
    expect(screen.getByText('Mistakes')).toBeDefined();
    expect(screen.getByText('Hard')).toBeDefined();
    expect(screen.getByText('1 of 3')).toBeDefined();
  });

  it('fills the percentile in once it arrives', async () => {
    seedSolves(solve());
    renderScreen();

    expect(screen.getByText('Percentile')).toBeDefined();
    await waitFor(() => expect(screen.getByText('Top 22%')).toBeDefined());
  });

  /*
   * The stat label itself changes for an unranked solve — `copy.md` gives
   * "Time · Difficulty · Mistakes · Ranked" with a value of "No". A screen that
   * kept the Percentile label and showed a dash would read as a figure that
   * failed to load rather than one that was never earned.
   */
  it('asks Ranked, not Percentile, when the solve was not ranked', async () => {
    seedSolves(solve({ usedHint: true }));
    renderScreen();

    expect(screen.getByText('Ranked')).toBeDefined();
    expect(screen.getByText('No')).toBeDefined();
    expect(screen.queryByText('Percentile')).toBeNull();
  });

  /*
   * Found in a browser, not by a test — the first render against a stack with
   * no puzzle row showed "Ranked — No" for a clean, checked first attempt.
   * That solve *is* eligible; only the figure was missing. Saying otherwise
   * tells the player they forfeited a ranking they did not forfeit.
   */
  it('keeps the Percentile label and shows a dash when the figure cannot be fetched', async () => {
    seedSolves(solve());
    renderScreen(DAILY, null);

    await waitFor(() => expect(screen.getByText('—')).toBeDefined());
    expect(screen.getByText('Percentile')).toBeDefined();
    expect(screen.queryByText('Ranked')).toBeNull();
    expect(screen.queryByText(/Top/)).toBeNull();
  });

  it.each([
    ['assisted', { usedHint: true }, /Assisted — one or more hints used/],
    ['second attempt', { attempt: 2 as const }, /Second attempt — the run holds/],
    ['unchecked', { checked: false }, /Unchecked — you played with checking off/],
  ])('carries the %s note', (_name, over, pattern) => {
    seedSolves(solve(over));
    renderScreen();

    expect(screen.getByText(pattern)).toBeDefined();
  });

  it('carries no note at all for a standard solve', () => {
    seedSolves(solve());
    renderScreen();

    expect(screen.queryByText(/Assisted|Second attempt|Unchecked/)).toBeNull();
  });

  /* With checking off there was no tally, so there is no count to state. */
  it('shows a dash rather than a mistake count when checking was off', () => {
    seedSolves(solve({ checked: false }));
    renderScreen();

    expect(screen.queryByText('1 of 3')).toBeNull();
    expect(screen.getByText('—')).toBeDefined();
  });

  it('counts down to the next edition', () => {
    seedSolves(solve());
    renderScreen();

    // 09:43 UTC to 00:05 UTC the next day.
    expect(screen.getByText(/14:22:00/)).toBeDefined();
  });

  describe('sharing', () => {
    it('copies the three spoiler-free lines and confirms', async () => {
      const writeText = vi.fn(async () => undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      seedSolves(solve());
      renderScreen();
      await waitFor(() => expect(screen.getByText('Top 22%')).toBeDefined());

      await userEvent.click(screen.getByRole('button', { name: /Share result/ }));

      expect(writeText).toHaveBeenCalledWith('NONET No. 208 · Hard\n07:12 · 1 mistake · top 22%\nnonet.app');
      await waitFor(() => expect(screen.getByText('Copied')).toBeDefined());
    });

    it('shows the share text so there is no doubt what is copied', () => {
      seedSolves(solve());
      renderScreen();

      expect(screen.getByText(/This is exactly what gets copied/)).toBeDefined();
    });

    /*
     * A refused clipboard must not leave the player thinking they copied
     * something. The toast is the only evidence either way.
     */
    it('does not claim to have copied when the clipboard refuses', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: async () => {
            throw new Error('denied');
          },
        },
      });

      seedSolves(solve());
      renderScreen();
      await userEvent.click(screen.getByRole('button', { name: /Share result/ }));

      expect(screen.queryByText('Copied')).toBeNull();
    });
  });

  /*
   * Landing here without a recorded solve — a bookmarked URL, a cleared
   * browser — has nothing to describe. Rather than invent an error screen, the
   * player goes back to where the puzzle is.
   */
  it('leaves for Home when there is no solve to describe', async () => {
    renderScreen();
    await waitFor(() => expect(onLeave).toHaveBeenCalled());
  });

  it('describes the most recent solve when a puzzle was played twice', () => {
    seedSolves(
      solve({ solvedAt: '2026-07-27T08:00:00.000Z', durationMs: 999_000 }),
      solve({ solvedAt: '2026-07-27T09:14:00.000Z', durationMs: 432_000, attempt: 2 }),
    );
    renderScreen();

    expect(screen.getAllByText('07:12')).toHaveLength(2);
    expect(screen.queryByText('16:39')).toBeNull();
  });
});
