/**
 * Emits the tokens as CSS custom properties.
 *
 * This is how the app consumes the package: one stylesheet, imported once, and
 * every component reads `var(--…)`. Colour re-tones with the theme for free,
 * and nothing hardcodes a value.
 */
import { BORDERS, FOCUS_OFFSET } from './border';
import { COLOR_TOKENS, palettes } from './color';
import type { ThemeName } from './color';
import { HATCH } from './hatch';
import { MOTION } from './motion';
import { RADIUS } from './radius';
import { SHADOWS } from './shadow';
import { SPACE, TAP_TARGET_MIN } from './space';
import { FAMILIES, TYPE_ROLES, resolveType } from './type';
import type { TypeRoleName } from './type';
import { BREAKPOINTS } from './viewports';
import type { Viewport } from './viewports';

const INDENT = '  ';

function declarations(entries: ReadonlyArray<readonly [string, string]>, indent: string): string {
  return entries.map(([name, value]) => `${indent}${name}: ${value};`).join('\n');
}

/**
 * Everything that changes with theme: the palette, plus the elevation shadow,
 * which needs a heavier alpha in dark to register at all.
 */
export function colorVariables(theme: ThemeName, indent = INDENT): string {
  const palette = palettes[theme];
  const entries: Array<readonly [string, string]> = COLOR_TOKENS.map(
    (token) => [token, palette[token]] as const,
  );

  for (const [name, value] of Object.entries(SHADOWS[theme])) {
    entries.push([`--shadow-${name}`, value]);
  }

  return declarations(entries, indent);
}

/** Everything that does not change with theme or viewport. */
export function staticVariables(indent = INDENT): string {
  const entries: Array<readonly [string, string]> = [];

  for (const [token, px] of Object.entries(SPACE)) entries.push([`--${token}`, `${px}px`]);
  entries.push(['--tap-target-min', `${TAP_TARGET_MIN}px`]);

  for (const [name, ms] of Object.entries(MOTION.duration)) {
    entries.push([`--motion-${name}`, `${ms}ms`]);
  }
  for (const [name, curve] of Object.entries(MOTION.easing)) {
    entries.push([`--ease-${name}`, curve]);
  }

  entries.push(['--radius-none', String(RADIUS.none)]);

  for (const [name, value] of Object.entries(BORDERS)) entries.push([`--border-${name}`, value]);
  entries.push(['--focus-offset', `${FOCUS_OFFSET.default}px`]);
  entries.push(['--focus-offset-prominent', `${FOCUS_OFFSET.prominent}px`]);

  // The elevation shadow is themed, so it lives with the palette.
  for (const [name, value] of Object.entries(HATCH)) entries.push([`--hatch-${name}`, value]);

  return declarations(entries, indent);
}

/** Type custom properties resolved at one design viewport. */
export function typeVariables(viewport: Viewport, indent = INDENT): string {
  const entries: Array<readonly [string, string]> = [
    ['--font-sans', `${FAMILIES.sans}, system-ui, sans-serif`],
    ['--font-mono', `"${FAMILIES.mono}", ui-monospace, monospace`],
  ];

  for (const name of Object.keys(TYPE_ROLES) as TypeRoleName[]) {
    const role = resolveType(name, viewport);
    entries.push([`--type-${name}-size`, `${role.size}px`]);
    entries.push([`--type-${name}-line-height`, role.lineHeight]);
    entries.push([`--type-${name}-letter-spacing`, role.letterSpacing]);
    entries.push([`--type-${name}-weight`, String(role.weight)]);
  }

  return declarations(entries, indent);
}

/**
 * The whole token sheet.
 *
 * Light is the default so a page renders correctly before any theme script
 * runs. Dark then arrives by system preference, and an explicit `data-theme`
 * on the root wins in **both** directions — a player who chose light must keep
 * light on a device set to dark.
 */
export function stylesheet(): string {
  const dark = colorVariables('dark', `${INDENT}${INDENT}`);

  return [
    '/* Generated from @nonet/design. Do not edit by hand. */',
    '',
    ':root {',
    colorVariables('light'),
    '',
    staticVariables(),
    '',
    typeVariables(390),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    `${INDENT}:root:not([data-theme="light"]) {`,
    dark,
    `${INDENT}}`,
    '}',
    '',
    ':root[data-theme="dark"] {',
    colorVariables('dark'),
    '}',
    '',
    ':root[data-theme="light"] {',
    colorVariables('light'),
    '}',
    '',
    `@media (min-width: ${BREAKPOINTS.drawer}px) {`,
    `${INDENT}:root {`,
    typeVariables(834, `${INDENT}${INDENT}`),
    `${INDENT}}`,
    '}',
    '',
    `@media (min-width: ${BREAKPOINTS.rail}px) {`,
    `${INDENT}:root {`,
    typeVariables(1440, `${INDENT}${INDENT}`),
    `${INDENT}}`,
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    `${INDENT}*, *::before, *::after {`,
    `${INDENT}${INDENT}animation-duration: ${MOTION.reducedMotionDuration}ms !important;`,
    `${INDENT}${INDENT}animation-iteration-count: 1 !important;`,
    `${INDENT}${INDENT}transition-duration: ${MOTION.reducedMotionDuration}ms !important;`,
    `${INDENT}${INDENT}scroll-behavior: auto !important;`,
    `${INDENT}}`,
    '}',
    '',
  ].join('\n');
}
