// @vitest-environment node
// Reads a committed file; jsdom would make `import.meta.url` an http URL.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tailwindLayer } from '@nonet/design';

/**
 * The generated Tailwind layer is the one place the token vocabulary is
 * duplicated, so it is the one place drift can hide. A committed file that a
 * test regenerates and compares is the same arrangement the engine uses for its
 * calibrated score floors: the artefact is reviewable in a diff, and it cannot
 * quietly fall behind the constants it came from.
 */
const committed = readFileSync(
  fileURLToPath(new URL('../src/app/theme.generated.css', import.meta.url)),
  'utf8',
);

describe('the generated Tailwind layer', () => {
  it('matches the tokens — run `pnpm --filter @nonet/web theme:gen` if this fails', () => {
    expect(committed).toBe(tailwindLayer());
  });

  it('uses `@theme inline`, so utilities follow the theme rather than freezing to light', () => {
    expect(committed).toContain('@theme inline {');
  });

  it('clears the stock palette, so a colour can only come from the design', () => {
    expect(committed).toContain('--color-*: initial;');
    expect(committed).toContain('--color-surface: var(--surface);');
  });

  it('clears the numeric spacing scale in favour of the 12 named steps', () => {
    expect(committed).toContain('--spacing: initial;');
    expect(committed).toContain('--spacing-3xl: var(--space-3xl);');
  });

  it('carries the two layout breakpoints and no others', () => {
    expect(committed).toContain('--breakpoint-*: initial;');
    expect(committed).toContain('--breakpoint-drawer: 768px;');
    expect(committed).toContain('--breakpoint-rail: 1100px;');
  });

  it('omits font-weight from cell-digit, whose weight depends on the content', () => {
    const block = committed.slice(committed.indexOf('@utility type-cell-digit {'));
    expect(block.slice(0, block.indexOf('}'))).not.toContain('font-weight');
  });
});
