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

export { AA_LARGE_TEXT, AA_NORMAL_TEXT, contrastRatio, meetsAA, relativeLuminance } from './contrast';

export {
  COLOR_TOKENS,
  CONTRAST_EXEMPT,
  TEXT_PAIRINGS,
  THEMES,
  palettes,
} from './color';
export type { ColorToken, Palette, ThemeName } from './color';

export {
  BREAKPOINTS,
  VIEWPORTS,
  atViewport,
  isResponsive,
  viewportForWidth,
} from './viewports';
export type { Responsive, Viewport } from './viewports';

export { FAMILIES, TYPE_ROLES, WEIGHTS, resolveType } from './type';
export type { FamilyName, ResolvedType, TypeRole, TypeRoleName } from './type';

export { SPACE, TAP_TARGET_AA_MIN, TAP_TARGET_MIN, nearestSpace } from './space';
export type { SpaceToken } from './space';

export { MOTION, MOTION_DEFECTS } from './motion';
export type { MotionDuration, MotionEasing } from './motion';

export { BORDERS, FOCUS_OFFSET } from './border';
export type { BorderToken } from './border';

export { SHADOWS } from './shadow';
export type { ShadowToken } from './shadow';

export { RADIUS } from './radius';
export type { RadiusToken } from './radius';

export { HATCH } from './hatch';
export type { HatchToken } from './hatch';

export { colorVariables, staticVariables, stylesheet, typeVariables } from './css';

export { tailwindLayer } from './tailwind';
