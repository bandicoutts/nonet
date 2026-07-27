import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from '@/components/HomeScreen';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const AT = new Date('2026-07-27T09:00:00.000Z');
const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 1_150_819_893 };

function solve(over: Partial<GuestSolve> = {}): GuestSolve {
  return {
    ref: DAILY,
    solvedAt: '2026-07-27T09:14:00.000Z',
    localDate: '2026-07-27',
    durationMs: 462_000,
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

function seedAutosave(ref: PuzzleRef, placed: number, elapsedMs = 221_000): void {
  window.localStorage.setItem(
    `nonet:autosave:${ref.kind}:${ref.difficulty}:${ref.seed}`,
    JSON.stringify({
      version: 1,
      ref,
      grid: Array.from({ length: 81 }, (_, i) => (i < placed ? '5' : '0')).join(''),
      notes: new Array(81).fill(0),
      elapsedMs,
      mistakes: 1,
      hintsUsed: 0,
      updatedAt: '2026-07-27T08:00:00.000Z',
    }),
  );
}

const show = () => render(<HomeScreen now={AT} />);

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});
afterEach(cleanup);

describe('HomeScreen, the daily hero', () => {
  it('invites a first-time player and shows no streak band', () => {
    show();

    expect(screen.getByText(/Solve today\u2019s puzzle to start a run/)).toBeDefined();
    // A band reading zero is a worse greeting than no band at all.
    expect(screen.queryByText('Consecutive days')).toBeNull();
  });

  it('offers an unplayed puzzle to a returning player', () => {
    seedSolves(solve({ ref: { kind: 'daily', difficulty: 'hard', seed: 42 }, localDate: '2026-07-26' }));
    show();

    expect(screen.getByRole('link', { name: /Enter the puzzle/ })).toBeDefined();
    expect(screen.getByText('Unopened')).toBeDefined();
    expect(screen.getByText('Consecutive days')).toBeDefined();
  });

  it('names the edition and its number', () => {
    show();

    expect(screen.getByText('No.')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getAllByText(/27 July 2026/).length).toBeGreaterThan(0);
  });

  it('resumes a board in progress, with the time on it', () => {
    seedAutosave(DAILY, 22, 221_000);
    show();

    expect(screen.getByRole('link', { name: /Resume · 03:41/ })).toBeDefined();
    expect(screen.getByText(/22 of 81 placed/)).toBeDefined();
    expect(screen.getByText('Saved in this browser')).toBeDefined();
  });

  /* The mistake count is pluralised, as it now is everywhere (NONET-20). */
  it('pluralises the mistake count on a board in progress', () => {
    seedAutosave(DAILY, 22);
    show();
    expect(screen.getByText(/1 mistake(?!s)/)).toBeDefined();
  });

  it('reports a solved daily and offers practice', () => {
    seedSolves(solve());
    show();

    expect(screen.getByText('Solved today')).toBeDefined();
    expect(screen.getByText('07:42')).toBeDefined();
    expect(screen.getByRole('button', { name: /Practice a hard one/ })).toBeDefined();
  });

  /*
   * `copy.md` gives a secondary "Replay, unscored" here, and it is deliberately
   * absent: replay mode does not exist. `solves.kind` can hold 'replay' and
   * nothing writes it, so the link would land on the ordinary daily board and
   * record a second *scored* solve for a puzzle already banked. A missing
   * action beats one that quietly corrupts the stats.
   */
  it('does not offer a replay it cannot honour', () => {
    seedSolves(solve());
    show();
    expect(screen.queryByText(/Replay/)).toBeNull();
  });

  it('says a locked board can be started again', () => {
    window.localStorage.setItem(`nonet:attempt:daily:easy:${DAILY.seed}`, '1');
    show();

    expect(screen.getByText(/Three mistakes — puzzle locked/)).toBeDefined();
    expect(screen.getByRole('link', { name: /Start again/ })).toBeDefined();
    expect(screen.getByText(/The run is held until midnight/)).toBeDefined();
  });

  /*
   * Not in copy.md. There is no third attempt (NONET-17), so the second failure
   * must not offer "Start again" — that would be a control that does nothing.
   */
  it('offers no restart once both attempts are gone', () => {
    window.localStorage.setItem(`nonet:attempt:daily:easy:${DAILY.seed}`, '2');
    show();

    expect(screen.queryByRole('link', { name: /Start again/ })).toBeNull();
    expect(screen.getByText(/tomorrow/i)).toBeDefined();
  });
});

describe('HomeScreen, the streak band', () => {
  it('counts consecutive days and the best run', () => {
    seedSolves(
      solve({ ref: { kind: 'daily', difficulty: 'hard', seed: 1 }, localDate: '2026-07-26' }),
      solve(),
    );
    show();

    expect(screen.getByText('Consecutive days')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText(/best 2 · 2 solved/)).toBeDefined();
  });

  /* Practice never touches the streak (GAME-RULES.md). */
  it('does not count practice solves', () => {
    seedSolves(
      solve({ ref: { kind: 'practice', difficulty: 'easy', seed: 3 }, kind: 'practice' }),
      solve({ ref: { kind: 'practice', difficulty: 'hard', seed: 4 }, kind: 'practice' }),
    );
    show();

    expect(screen.getByText(/best 0 · 0 solved/)).toBeDefined();
  });
});

describe('HomeScreen, practice', () => {
  it('offers all four bands', () => {
    for (const band of ['Easy', 'Medium', 'Hard', 'Expert']) {
      cleanup();
      show();
      expect(screen.getByRole('button', { name: new RegExp(band) })).toBeDefined();
    }
  });

  it('starts a practice puzzle in the chosen band', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: /Medium/ }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(String(push.mock.calls[0]?.[0])).toMatch(/kind=practice.*difficulty=medium/);
  });

  it('shows an unfinished practice puzzle', () => {
    seedAutosave({ kind: 'practice', difficulty: 'medium', seed: 12 }, 22, 221_000);
    show();

    expect(screen.getByText(/Unfinished practice puzzle — Medium, 22 of 81 placed/)).toBeDefined();
    expect(screen.getByRole('link', { name: /Resume · 03:41/ })).toBeDefined();
  });

  /*
   * One practice puzzle at a time, and starting another discards it — so the
   * player is asked first. Practice boards are not kept, which is the one thing
   * that makes this destructive rather than a navigation.
   */
  it('confirms before discarding an unfinished practice puzzle', async () => {
    seedAutosave({ kind: 'practice', difficulty: 'medium', seed: 12 }, 22, 221_000);
    show();

    await userEvent.click(screen.getByRole('button', { name: /Hard/ }));

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Starting Hard discards it/)).toBeDefined();
    expect(push).not.toHaveBeenCalled();
  });

  it('discards and starts when confirmed', async () => {
    seedAutosave({ kind: 'practice', difficulty: 'medium', seed: 12 }, 22);
    show();

    await userEvent.click(screen.getByRole('button', { name: /Hard/ }));
    await userEvent.click(screen.getByRole('button', { name: /Discard and start/ }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    // The discarded board is gone, not merely navigated away from.
    expect(window.localStorage.getItem('nonet:autosave:practice:medium:12')).toBeNull();
  });

  it('keeps the board when the confirm is dismissed', async () => {
    seedAutosave({ kind: 'practice', difficulty: 'medium', seed: 12 }, 22);
    show();

    await userEvent.click(screen.getByRole('button', { name: /Hard/ }));
    await userEvent.click(screen.getByRole('button', { name: /Keep playing/ }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('nonet:autosave:practice:medium:12')).not.toBeNull();
  });

  /* Nothing to discard means nothing to confirm. */
  it('does not confirm when no practice board is open', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: /Hard/ }));

    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
