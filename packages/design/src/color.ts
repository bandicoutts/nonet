/**
 * Colour, transcribed from `design/export/tokens.json` → `color`.
 *
 * Light and dark are designed siblings, not inversions — every token is
 * authored for its theme, so neither palette is derived from the other.
 */

export const THEMES = ['light', 'dark'] as const;
export type ThemeName = (typeof THEMES)[number];

export const COLOR_TOKENS = [
  '--bg',
  '--surface',
  '--fg',
  '--fg2',
  '--fg3',
  '--fg3-text',
  '--line',
  '--line2',
  '--accent',
  '--accent-ink',
  '--cell-hl',
  '--cell-same',
  '--cell-sel',
  '--error',
  '--error-soft',
  '--hover',
  '--rule',
  '--deco',
  '--veil',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export type Palette = Readonly<Record<ColorToken, string>>;

const light: Palette = {
  '--bg': '#F1F2F3',
  '--surface': '#FBFBFC',
  '--fg': '#16181B',
  '--fg2': '#4B5157',
  // Disabled and spent states only — see CONTRAST_EXEMPT.
  '--fg3': '#6C7278',
  // Captions, kickers, metadata, inactive states and note text (NONET-5).
  '--fg3-text': '#5A5F65',
  '--line': '#CFD3D6',
  '--line2': '#DEE1E3',
  '--accent': '#2C41C4',
  '--accent-ink': '#FBFBFC',
  '--cell-hl': '#E8EAEC',
  '--cell-same': '#E4E8F8',
  '--cell-sel': '#D7DDF9',
  '--error': '#A9231A',
  '--error-soft': '#F4DDDA',
  '--hover': '#E7E9EB',
  '--rule': '#16181B',
  '--deco': '#C3C7CB',
  '--veil': '#EDEEEF',
};

const dark: Palette = {
  '--bg': '#131518',
  '--surface': '#1A1D20',
  '--fg': '#EDEFF1',
  '--fg2': '#B4BABF',
  '--fg3': '#8B9298',
  '--fg3-text': '#A0A6AA',
  '--line': '#2A2F34',
  '--line2': '#23282C',
  '--accent': '#93A6FF',
  '--accent-ink': '#131518',
  '--cell-hl': '#22262A',
  '--cell-same': '#242B3D',
  '--cell-sel': '#2C365C',
  '--error': '#FF8A75',
  '--error-soft': '#3A211C',
  '--hover': '#22262A',
  '--rule': '#8B939A',
  '--deco': '#3D444A',
  '--veil': '#15181B',
};

export const palettes: Readonly<Record<ThemeName, Palette>> = { light, dark };

/**
 * Where each text colour is actually rendered, taken from
 * `design/export/components.md`. The contrast suite walks this list in both
 * themes, so it is the definition of "which pairings must meet AA" — adding a
 * component that puts a foreground on a new background means adding it here.
 *
 * Deliberately not a cartesian product: pairings the product never renders
 * would fail for no reason and train everyone to ignore the suite.
 */
export const TEXT_PAIRINGS: ReadonlyArray<{
  readonly foreground: ColorToken;
  readonly backgrounds: readonly ColorToken[];
  readonly where: string;
}> = [
  {
    foreground: '--fg',
    backgrounds: ['--bg', '--surface', '--veil', '--cell-hl', '--cell-same', '--cell-sel', '--hover'],
    where: 'Given digits, headings, active nav and chips, drawer primary rows',
  },
  {
    foreground: '--fg2',
    backgrounds: ['--bg', '--surface', '--veil'],
    where: 'Body copy, dialog body, banner body, inactive drawer secondary rows',
  },
  {
    foreground: '--fg3-text',
    backgrounds: ['--bg', '--surface', '--veil', '--hover', '--cell-hl', '--cell-same', '--cell-sel'],
    where: 'Captions, mono kickers, metadata, inactive states, and note text in cells',
  },
  {
    foreground: '--accent',
    backgrounds: ['--bg', '--surface', '--cell-hl', '--cell-same', '--cell-sel'],
    where: 'Player-entered digits, links',
  },
  {
    foreground: '--accent-ink',
    backgrounds: ['--accent'],
    where: 'Label on a filled button',
  },
  {
    foreground: '--error',
    backgrounds: ['--bg', '--surface', '--error-soft', '--veil'],
    where: 'Wrong digits and error messages',
  },
];

/**
 * Tokens that carry no text and are therefore outside WCAG 1.4.3. Recorded
 * rather than merely omitted, so that "this does not meet 4.5:1" reads as a
 * decision with a reason rather than an oversight.
 */
export const CONTRAST_EXEMPT: ReadonlyArray<{
  readonly token: ColorToken;
  readonly reason: string;
}> = [
  {
    token: '--fg3',
    reason:
      'Disabled and spent states only. WCAG 1.4.3 exempts disabled controls, and a spent pad key carries a 45-degree hatch as a non-colour cue, so nothing depends on its contrast. Everything else that was --fg3 in the prototype is now --fg3-text (DECISIONS.md NONET-5).',
  },
  {
    token: '--deco',
    reason:
      'Decorative rules and dividers that carry no information and never sit behind or in front of text. Measured 1.52:1 light and 1.85:1 dark in the export, which is fine for decoration.',
  },
];
