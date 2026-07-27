import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTING_COLUMNS,
  fromProfileRow,
  readSettings,
  toProfileRow,
  writeSettings,
} from '../src/lib/settings';
import { THEME_KEY } from '../src/lib/theme';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('settings', () => {
  it('start on the product defaults', () => {
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trip', () => {
    const changed = { ...DEFAULT_SETTINGS, inputMode: 'digitFirst' as const, checking: false };
    writeSettings(changed);
    expect(readSettings()).toEqual(changed);
  });

  /**
   * The theme script runs before any module is loaded and reads its own key, so
   * the two have to be kept in step — otherwise choosing a theme in Settings
   * would work until the next reload.
   */
  it('keep the pre-hydration theme key in step', () => {
    writeSettings({ ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  /**
   * Merged field by field rather than accepted or rejected whole, so a setting
   * added in a later version arrives at its default instead of resetting the
   * ones a player had already chosen.
   */
  it('fill a missing field from the default without losing the others', () => {
    window.localStorage.setItem(
      'nonet:settings',
      JSON.stringify({ inputMode: 'digitFirst', checking: false }),
    );

    expect(readSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      inputMode: 'digitFirst',
      checking: false,
    });
  });

  it('ignore a value of the wrong type rather than adopting it', () => {
    window.localStorage.setItem(
      'nonet:settings',
      JSON.stringify({ checking: 'yes', theme: 'sepia' }),
    );

    const settings = readSettings();
    expect(settings.checking).toBe(true);
    expect(settings.theme).toBe('system');
  });

  it('survive unreadable storage', () => {
    window.localStorage.setItem('nonet:settings', '{ not json');
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('do not throw when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(() => writeSettings(DEFAULT_SETTINGS)).not.toThrow();
  });
});

/**
 * These field names are the `profiles` columns in camelCase, so signing in is a
 * copy rather than a translation. A setting that exists on one side and not the
 * other is a setting the sync silently drops.
 */
describe('the profile row', () => {
  it('names a column for every setting', () => {
    expect(Object.keys(SETTING_COLUMNS).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it('uses the snake_case column names the table has', () => {
    expect(toProfileRow(DEFAULT_SETTINGS)).toEqual({
      theme: 'system',
      input_mode: 'cellFirst',
      checking: true,
      auto_advance: false,
      highlight_matching: true,
      highlight_units: true,
      show_timer: true,
    });
  });

  it('round-trips through the server shape', () => {
    const changed = { ...DEFAULT_SETTINGS, autoAdvance: true, showTimer: false };
    expect(fromProfileRow(toProfileRow(changed))).toEqual(changed);
  });

  it('falls back to a default for a column the server did not send', () => {
    expect(fromProfileRow({ theme: 'dark' })).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });
});
