/**
 * @nonet/design — the single source of truth for styling.
 *
 * Transcribed from the Claude Design prototype's Tokens screen via
 * `design/export/tokens.json`. Never hardcode a colour, size or spacing in a
 * component: import from here, or read the CSS custom properties that
 * `stylesheet()` emits.
 *
 * One deliberate departure from the export: `--fg3` was split in two, because
 * a single token could not carry both note text and disabled states without
 * failing WCAG AA. See DECISIONS.md NONET-5.
 */

export { AA_LARGE_TEXT, AA_NORMAL_TEXT, contrastRatio, meetsAA, relativeLuminance } from './contrast.js';

export {
  COLOR_TOKENS,
  CONTRAST_EXEMPT,
  TEXT_PAIRINGS,
  THEMES,
  palettes,
} from './color.js';
export type { ColorToken, Palette, ThemeName } from './color.js';

export {
  BREAKPOINTS,
  VIEWPORTS,
  atViewport,
  isResponsive,
  viewportForWidth,
} from './viewports.js';
export type { Responsive, Viewport } from './viewports.js';

export { FAMILIES, TYPE_ROLES, WEIGHTS, resolveType } from './type.js';
export type { FamilyName, ResolvedType, TypeRole, TypeRoleName } from './type.js';

export { SPACE, TAP_TARGET_AA_MIN, TAP_TARGET_MIN, nearestSpace } from './space.js';
export type { SpaceToken } from './space.js';

export { MOTION, MOTION_DEFECTS } from './motion.js';
export type { MotionDuration, MotionEasing } from './motion.js';

export { BORDERS, FOCUS_OFFSET } from './border.js';
export type { BorderToken } from './border.js';

export { SHADOWS } from './shadow.js';
export type { ShadowToken } from './shadow.js';

export { RADIUS } from './radius.js';
export type { RadiusToken } from './radius.js';

export { HATCH } from './hatch.js';
export type { HatchToken } from './hatch.js';

export { colorVariables, staticVariables, stylesheet, typeVariables } from './css.js';
