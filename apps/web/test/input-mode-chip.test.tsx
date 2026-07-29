import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardScreen } from '@/components/BoardScreen';
import { readSettings } from '@/lib/settings';
import type { PuzzleRef } from '@/lib/storage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

/**
 * The board reads `inputMode` **once, on mount**, into the session — and the
 * chip is a second writer of the same value.
 *
 * That is the exact shape that produced the theme divergence: a value read once
 * at one place and written from two, with nothing reconciling them (NONET-41).
 * There, `SettingsScreen` read the standalone key while `MobileDrawer` read the
 * blob, and the two surfaces disagreed about what the player had chosen.
 *
 * So the property under test is not "the chip toggles" — it is that **the chip,
 * the store, and a remount all agree**. A chip that only dispatched would work
 * until reload and silently revert; one that only persisted would not change
 * the board under the player's hands.
 */
const REF: PuzzleRef = { kind: 'daily', difficulty: 'easy', seed: 4242 };

const chip = () => screen.getByRole('button', { name: /digit first/i });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('the input-mode chip', () => {
  it('starts unpressed, matching the stored default', () => {
    render(<BoardScreen puzzleRef={REF} />);
    expect(chip().getAttribute('aria-pressed')).toBe('false');
    expect(readSettings().inputMode).toBe('cellFirst');
  });

  it('writes through to the settings store when pressed', async () => {
    const user = userEvent.setup();
    render(<BoardScreen puzzleRef={REF} />);

    await user.click(chip());

    expect(chip().getAttribute('aria-pressed')).toBe('true');
    expect(readSettings().inputMode).toBe('digitFirst');
  });

  /** The half a dispatch-only chip would fail. */
  it('still shows digit-first after a remount', async () => {
    const user = userEvent.setup();
    const first = render(<BoardScreen puzzleRef={REF} />);

    await user.click(chip());
    first.unmount();

    render(<BoardScreen puzzleRef={REF} />);
    expect(chip().getAttribute('aria-pressed')).toBe('true');
  });

  /** And back again, so the persistence is a value rather than a latch. */
  it('goes back to cell-first, and stays there across a remount', async () => {
    const user = userEvent.setup();
    const first = render(<BoardScreen puzzleRef={REF} />);

    await user.click(chip());
    await user.click(chip());
    expect(readSettings().inputMode).toBe('cellFirst');

    first.unmount();
    render(<BoardScreen puzzleRef={REF} />);
    expect(chip().getAttribute('aria-pressed')).toBe('false');
  });

  /**
   * Settings is the other door. A board mounted after Settings wrote the value
   * must show what Settings chose — the direction that fails if the board reads
   * a different store from the one Settings writes.
   */
  it('reflects a change made in Settings rather than on the board', () => {
    window.localStorage.setItem('nonet:settings', JSON.stringify({ inputMode: 'digitFirst' }));

    render(<BoardScreen puzzleRef={REF} />);
    expect(chip().getAttribute('aria-pressed')).toBe('true');
  });

  /** Redo lost the slot; the keyboard is where it still lives. */
  it('has taken the place Redo occupied', () => {
    render(<BoardScreen puzzleRef={REF} />);
    expect(screen.queryByRole('button', { name: /^redo$/i })).toBeNull();
  });
});
