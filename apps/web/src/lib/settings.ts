/**
 * Player settings.
 *
 * "Settings are kept in this browser. Sign in and they follow you, along with
 * the streak." Both halves of that promise are served from one shape: these
 * field names are the `profiles` columns in camelCase, so signing in is a copy
 * rather than a translation, and a setting added to one side has an obvious
 * home on the other.
 *
 * Defaults here must match the column defaults exactly. If they drift, signing
 * in silently changes how the board plays — which is the one thing a sync must
 * never do.
 */
import { THEME_KEY, isThemeChoice } from './theme';
import type { ThemeChoice } from './theme';

const SETTINGS_KEY = 'nonet:settings';

export interface Settings {
  readonly theme: ThemeChoice;
  readonly inputMode: 'cellFirst' | 'digitFirst';
  /** The purist toggle. Off means nothing flagged, nothing tallied, no percentile. */
  readonly checking: boolean;
  readonly autoAdvance: boolean;
  readonly highlightMatching: boolean;
  readonly highlightUnits: boolean;
  /** Hiding the timer does not stop it. The time is recorded and shown at the end. */
  readonly showTimer: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  inputMode: 'cellFirst',
  checking: true,
  autoAdvance: false,
  highlightMatching: true,
  highlightUnits: true,
  showTimer: true,
};

/** The `profiles` column for each setting, which is what the sync copies into. */
export const SETTING_COLUMNS: Readonly<Record<keyof Settings, string>> = {
  theme: 'theme',
  inputMode: 'input_mode',
  checking: 'checking',
  autoAdvance: 'auto_advance',
  highlightMatching: 'highlight_matching',
  highlightUnits: 'highlight_units',
  showTimer: 'show_timer',
};

function isSettings(value: unknown): value is Partial<Settings> {
  return typeof value === 'object' && value !== null;
}

/**
 * Read, filling any gap from the defaults.
 *
 * Merging field by field rather than rejecting the whole record means a setting
 * added in a later version arrives at its default instead of resetting the six
 * a player had already chosen.
 */
export function readSettings(): Settings {
  let stored: unknown = null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    stored = raw === null ? null : JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }

  if (!isSettings(stored)) return DEFAULT_SETTINGS;

  const theme = isThemeChoice(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme;

  return {
    theme,
    inputMode: stored.inputMode === 'digitFirst' ? 'digitFirst' : DEFAULT_SETTINGS.inputMode,
    checking: typeof stored.checking === 'boolean' ? stored.checking : DEFAULT_SETTINGS.checking,
    autoAdvance:
      typeof stored.autoAdvance === 'boolean' ? stored.autoAdvance : DEFAULT_SETTINGS.autoAdvance,
    highlightMatching:
      typeof stored.highlightMatching === 'boolean'
        ? stored.highlightMatching
        : DEFAULT_SETTINGS.highlightMatching,
    highlightUnits:
      typeof stored.highlightUnits === 'boolean'
        ? stored.highlightUnits
        : DEFAULT_SETTINGS.highlightUnits,
    showTimer:
      typeof stored.showTimer === 'boolean' ? stored.showTimer : DEFAULT_SETTINGS.showTimer,
  };
}

export function writeSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // The theme script reads its own key before any of this module is loaded,
    // so the two are kept in step rather than one being derived from the other.
    window.localStorage.setItem(THEME_KEY, settings.theme);
  } catch {
    // A player who cannot persist can still change settings for this session.
  }
}

/** The row shape the sync writes to `profiles`. */
export function toProfileRow(settings: Settings): Record<string, unknown> {
  return Object.fromEntries(
    (Object.keys(SETTING_COLUMNS) as Array<keyof Settings>).map((key) => [
      SETTING_COLUMNS[key],
      settings[key],
    ]),
  );
}

/** The reverse, for a profile arriving from the server. */
export function fromProfileRow(row: Record<string, unknown>): Settings {
  const read = <K extends keyof Settings>(key: K): Settings[K] => {
    const value = row[SETTING_COLUMNS[key]];
    return value === undefined || value === null ? DEFAULT_SETTINGS[key] : (value as Settings[K]);
  };

  return {
    theme: isThemeChoice(row['theme']) ? row['theme'] : DEFAULT_SETTINGS.theme,
    inputMode: read('inputMode'),
    checking: read('checking'),
    autoAdvance: read('autoAdvance'),
    highlightMatching: read('highlightMatching'),
    highlightUnits: read('highlightUnits'),
    showTimer: read('showTimer'),
  };
}
