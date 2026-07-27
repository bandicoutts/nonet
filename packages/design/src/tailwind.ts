/**
 * The bridge from the token sheet to Tailwind.
 *
 * `stylesheet()` emits the tokens as runtime custom properties, which is what
 * lets a theme change re-tone the page without a rebuild. Tailwind, though,
 * needs the *names* at build time to generate utilities. Writing that mapping
 * by hand would put a second, silently-drifting copy of the token vocabulary in
 * the app — precisely the failure NONET-6 exists to prevent — so it is
 * generated from the same constants the sheet is.
 *
 * Two things make this safe:
 *
 * - **`@theme inline`.** Without it Tailwind bakes the token's *value* into the
 *   utility at build time, and `bg-surface` would be frozen to the light
 *   palette. Inline emits `background-color: var(--surface)`, so the utility
 *   follows whatever `[data-theme]` resolves to.
 * - **The namespaces are cleared first.** `--color-*: initial` removes
 *   Tailwind's stock palette, so `bg-red-500` does not exist and a colour can
 *   only come from the design. Same for spacing and breakpoints.
 */
import { COLOR_TOKENS } from './color';
import { SPACE } from './space';
import { FAMILIES, TYPE_ROLES } from './type';
import type { TypeRoleName } from './type';
import { BREAKPOINTS } from './viewports';

const HEADER = '/* Generated from @nonet/design by `pnpm --filter @nonet/web theme:gen`. Do not edit. */';

/**
 * The `@theme inline` block: colours, the space scale and the two layout
 * breakpoints, each aliased onto the custom property the sheet emits.
 */
function themeBlock(): string {
  const lines: string[] = [];

  lines.push('@theme inline {');

  lines.push('  /* Only the design has colours. */');
  lines.push('  --color-*: initial;');
  for (const token of COLOR_TOKENS) {
    lines.push(`  --color-${token.slice(2)}: var(${token});`);
  }

  lines.push('');
  lines.push('  /* The 12-step scale only — no numeric `p-4`, which is how the');
  lines.push('     prototype accumulated 26 off-scale values (NONET-6). Use an');
  lines.push('     arbitrary value and a reason when a measurement genuinely');
  lines.push('     falls between steps. */');
  lines.push('  --spacing: initial;');
  lines.push('  --spacing-*: initial;');
  lines.push('  /* Zero is not off-scale. Disabling the multiplier above also');
  lines.push('     removes `inset-0`, `p-0` and `gap-0`, and it removes them');
  lines.push('     *silently* — a `fixed inset-0` overlay simply does not cover');
  lines.push('     anything. Naming the step brings those back without bringing');
  lines.push('     back `p-4`. */');
  lines.push('  --spacing-0: 0px;');
  for (const token of Object.keys(SPACE)) {
    lines.push(`  --spacing-${token.slice('space-'.length)}: var(--${token});`);
  }

  lines.push('');
  lines.push('  /* Where the layout actually switches, not where it was drawn. */');
  lines.push('  --breakpoint-*: initial;');
  for (const [name, px] of Object.entries(BREAKPOINTS)) {
    lines.push(`  --breakpoint-${name}: ${px}px;`);
  }

  lines.push('');
  lines.push('  /* `font-sans` and `font-mono` must mean Archivo and IBM Plex Mono,');
  lines.push('     never Tailwind’s stock stacks. */');
  for (const family of Object.keys(FAMILIES)) {
    lines.push(`  --font-${family}: var(--font-${family});`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * One `@utility` per type role.
 *
 * A role is four or five properties that always travel together, and the
 * underlying custom properties already step at the layout breakpoints — so
 * `type-kicker` is responsive without a variant.
 *
 * Roles whose weight depends on the *content* rather than the position
 * (`cell-digit` is bold as a given, regular as an entry) deliberately omit
 * `font-weight`: the sheet can only emit one value per role, and picking one
 * here would make every player entry render as a given.
 */
function typeUtilities(): string {
  const blocks: string[] = [];

  for (const name of Object.keys(TYPE_ROLES) as TypeRoleName[]) {
    const role = TYPE_ROLES[name];
    const declarations = [
      `font-family: var(--font-${role.family});`,
      `font-size: var(--type-${name}-size);`,
      `line-height: var(--type-${name}-line-height);`,
      `letter-spacing: var(--type-${name}-letter-spacing);`,
    ];

    if (typeof role.weight === 'number') {
      declarations.push(`font-weight: var(--type-${name}-weight);`);
    }
    if (role.tabular) {
      declarations.push('font-variant-numeric: tabular-nums;');
    }
    if (role.case === 'uppercase') {
      declarations.push('text-transform: uppercase;');
    }

    blocks.push(
      [`@utility type-${name} {`, ...declarations.map((d) => `  ${d}`), '}'].join('\n'),
    );
  }

  return blocks.join('\n\n');
}

/** The whole generated Tailwind layer, ready to be written next to `globals.css`. */
export function tailwindLayer(): string {
  return [HEADER, '', themeBlock(), '', typeUtilities(), ''].join('\n');
}
