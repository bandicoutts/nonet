import { describe, expect, test } from 'vitest';
import { colorVariables, stylesheet, staticVariables, typeVariables } from '../src/css.js';
import { palettes } from '../src/color.js';
import { viewportForWidth } from '../src/viewports.js';

describe('viewportForWidth', () => {
  test('maps a real width to the design viewport it was drawn at', () => {
    expect(viewportForWidth(390)).toBe(390);
    expect(viewportForWidth(767)).toBe(390);
    expect(viewportForWidth(768)).toBe(834);
    expect(viewportForWidth(1099)).toBe(834);
    expect(viewportForWidth(1100)).toBe(1440);
    expect(viewportForWidth(1920)).toBe(1440);
  });
});

describe('colorVariables', () => {
  test('emits every token for the theme', () => {
    const css = colorVariables('light');
    for (const [token, value] of Object.entries(palettes.light)) {
      expect(css).toContain(`${token}: ${value};`);
    }
  });

  test('light and dark emit the same tokens with different values', () => {
    const names = (css: string) => css.match(/--[\w-]+(?=:)/g)?.sort();
    expect(names(colorVariables('dark'))).toEqual(names(colorVariables('light')));
    expect(colorVariables('dark')).not.toBe(colorVariables('light'));
  });
});

describe('themed shadow', () => {
  test('the shadow is emitted per theme, not once', () => {
    expect(colorVariables('light')).toContain('--shadow-elevation:');
    expect(colorVariables('dark')).toContain('--shadow-elevation:');
    expect(colorVariables('light')).not.toBe(colorVariables('dark'));
  });

  test('staticVariables no longer carries it', () => {
    expect(staticVariables()).not.toContain('--shadow-elevation:');
  });
});

describe('staticVariables', () => {
  test('emits spacing, motion, radius and the hatch', () => {
    const css = staticVariables();
    expect(css).toContain('--space-3xs: 4px;');
    expect(css).toContain('--space-4xl: 88px;');
    expect(css).toContain('--motion-hover: 150ms;');
    expect(css).toContain('--motion-place: 180ms;');
    expect(css).toContain('--radius-none: 0;');
    expect(css).toContain('--hatch-spent-key:');
    expect(css).toContain('--tap-target-min: 44px;');
  });

  test('emits the border recipes the board depends on', () => {
    const css = staticVariables();
    expect(css).toContain('--border-hairline:');
    expect(css).toContain('--border-cell-box:');
    expect(css).toContain('--border-focus-ring-cell:');
  });
});

describe('typeVariables', () => {
  test('emits a size, line height and tracking per role', () => {
    const css = typeVariables(1440);
    expect(css).toContain('--type-display-size: 56px;');
    expect(css).toContain('--type-display-line-height: 1.02;');
    expect(css).toContain('--type-display-letter-spacing: -0.04em;');
  });

  test('responsive roles change with the viewport', () => {
    expect(typeVariables(390)).toContain('--type-display-size: 32px;');
    expect(typeVariables(834)).toContain('--type-display-size: 44px;');
  });

  test('flat roles hold steady across viewports', () => {
    for (const viewport of [390, 834, 1440] as const) {
      expect(typeVariables(viewport)).toContain('--type-kicker-size: 11px;');
    }
  });

  test('emits the families', () => {
    expect(typeVariables(390)).toContain('--font-sans: Archivo');
    expect(typeVariables(390)).toContain('--font-mono: "IBM Plex Mono"');
  });
});

describe('stylesheet', () => {
  const css = stylesheet();

  test('light is the default and dark arrives by system preference', () => {
    expect(css).toContain(':root {');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  test('an explicit theme choice beats the system preference in both directions', () => {
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain(':root[data-theme="light"]');
  });

  test('steps type up at the layout breakpoints, not the drawing widths', () => {
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('@media (min-width: 1100px)');
  });

  test('honours reduced motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('1ms');
  });

  test('is balanced — every block closes', () => {
    expect((css.match(/\{/g) ?? []).length).toBe((css.match(/\}/g) ?? []).length);
  });

  test('carries no colour outside the theme blocks', () => {
    // The responsive type and reduced-motion blocks must be colour-free: a
    // literal there would not re-tone, which is the defect that left the
    // prototype's links stuck on light-theme blue in dark mode.
    const responsiveAndBelow = css.slice(css.indexOf('@media (min-width:'));
    expect(responsiveAndBelow).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(responsiveAndBelow).not.toMatch(/rgba?\(/);
  });
});
