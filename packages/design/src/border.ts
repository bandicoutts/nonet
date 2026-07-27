/**
 * Border, rule and outline recipes, transcribed from
 * `design/export/tokens.json` → `border`.
 *
 * These are CSS fragments referencing colour tokens rather than literals, so
 * they re-tone with the theme. Several are `inset` box-shadows rather than
 * borders: cells meet edge to edge, so a real border would shift the grid.
 */
export const BORDERS = {
  hairline: '1px solid var(--line)',
  'hairline-soft': '1px solid var(--line2)',
  rule: '2px solid var(--rule)',
  'dashed-soft': '1px dashed var(--line2)',
  'dashed-line': '1px dashed var(--line)',
  'dashed-accent': '1px dashed var(--accent)',

  /** Between cells inside a box. */
  'cell-thin': 'inset 0 0 0 1px var(--line)',
  /** Every third cell edge, and the grid frame. */
  'cell-box': 'inset 0 0 0 2px var(--rule)',
  'selected-ring': 'inset 0 0 0 2px var(--accent)',
  /** Nav link, and drawer and year tabs. */
  'underline-active': 'inset 0 -2px 0 var(--accent)',

  /** Offset is 2px, or 3px on the nav link and primary button. */
  'focus-ring': '2px solid var(--fg)',
  /** Drawn inside, because cells meet edge to edge and an outline would clip. */
  'focus-ring-cell': 'inset 0 0 0 2px var(--bg), inset 0 0 0 4px var(--fg)',

  'input-focus': '0 0 0 2px var(--cell-sel)',
  'error-underline': 'underline 2px',
  'spent-strike': 'line-through 1px',
} as const;

export type BorderToken = keyof typeof BORDERS;

/** Focus outline offsets, in pixels. */
export const FOCUS_OFFSET = {
  default: 2,
  /** Nav link and primary button sit tighter to their neighbours. */
  prominent: 3,
} as const;
