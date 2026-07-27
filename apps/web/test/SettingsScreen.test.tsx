import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from '@/components/SettingsScreen';
import { DEFAULT_SETTINGS, readSettings } from '@/lib/settings';
import { readTheme } from '@/lib/theme';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => null, isConfigured: () => false }));

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('SettingsScreen', () => {
  it('states what it is and where settings live', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('How you play.')).toBeDefined();
    expect(screen.getByText(/Settings are kept in this browser/)).toBeDefined();
  });

  /*
   * Scoped to the row labels rather than the whole document: `copy.md` gives
   * the Checking row and its control the same word, so a bare text query is
   * ambiguous by design rather than by mistake.
   */
  it('offers every setting the store holds', () => {
    const { container } = render(<SettingsScreen />);
    const labels = [...container.querySelectorAll('dt')].map((dt) => dt.textContent);

    expect(labels).toEqual([
      'Theme',
      'Input',
      'Auto-advance',
      'Checking',
      'Highlight matching digits',
      'Highlight row, column and box',
      'Show timer',
    ]);
  });

  /*
   * The four that OPEN-QUESTIONS #2 records as stored, synced and honoured by
   * nothing. Having a control is half of closing that; the board reading them
   * is the other half.
   */
  it.each([
    ['Matching', 'highlightMatching'],
    ['Units', 'highlightUnits'],
    ['Timer', 'showTimer'],
    ['Advance', 'autoAdvance'],
  ] as const)('persists %s', async (control, key) => {
    render(<SettingsScreen />);

    await userEvent.click(screen.getByRole('button', { name: control }));
    expect(readSettings()[key]).toBe(!DEFAULT_SETTINGS[key]);
  });

  it('persists the input mode', async () => {
    render(<SettingsScreen />);

    await userEvent.click(screen.getByRole('button', { name: /Digit → cells/ }));
    expect(readSettings().inputMode).toBe('digitFirst');
  });

  it('persists checking', async () => {
    render(<SettingsScreen />);

    await userEvent.click(screen.getByRole('button', { name: 'Checking' }));
    expect(readSettings().checking).toBe(false);
  });

  /*
   * Theme is stored under its own key, not in the settings blob — it is read by
   * a blocking inline script before first paint, and that script cannot parse a
   * JSON object (NONET-11). Both have to move together.
   */
  it('writes the theme to the key the pre-paint script reads', async () => {
    render(<SettingsScreen />);

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(readTheme()).toBe('dark');
    expect(readSettings().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('shows the state each control is in', async () => {
    render(<SettingsScreen />);
    const checking = screen.getByRole('button', { name: 'Checking' });

    expect(checking.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(checking);
    expect(checking.getAttribute('aria-pressed')).toBe('false');
  });

  /*
   * Auto-advance is cell-first only, and the copy says so. Leaving it live in
   * digit-first would offer a setting that silently does nothing.
   */
  it('disables auto-advance in digit-first', async () => {
    render(<SettingsScreen />);

    await userEvent.click(screen.getByRole('button', { name: /Digit → cells/ }));
    expect(screen.getByRole('button', { name: 'Advance' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('tells a guest their progress is local', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('Playing as a guest')).toBeDefined();
    expect(screen.getByText(/Progress is kept in this browser only/)).toBeDefined();
    expect(screen.getByRole('link', { name: /Sign in/ })).toBeDefined();
  });
});
