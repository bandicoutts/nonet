import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A Tailwind class in a cleared namespace generates no CSS, and nothing says so.
 *
 * `theme.generated.css` sets `--color-*`, `--spacing-*` and `--breakpoint-*` to
 * `initial`, so the design tokens are the only vocabulary (NONET-11). The cost
 * is that `bg-red-500`, `p-4` and `md:` are not errors — they are silently
 * nothing, which is **indistinguishable from a rule that has no effect**. That
 * is exactly what hid the `inset-0` bug in NONET-19, where every fixed overlay
 * in the app failed to cover the screen and the whole suite stayed green.
 *
 * This closes the class of bug rather than the instance. It is deliberately
 * conservative: it flags the names a developer would plausibly reach for out of
 * habit, not everything that could theoretically be ungenerated, so a failure
 * here is always a real one.
 */

const SRC = join(import.meta.dirname, '..', 'src');

/** Tailwind's own palette. Cleared by `--color-*: initial`. */
const PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose', 'black', 'white',
].join('|');

/** The utilities that resolve through the spacing scale. */
const SPACED = [
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me',
  'gap', 'gap-x', 'gap-y', 'space-x', 'space-y',
  'inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'start', 'end',
  'w', 'h', 'size', 'min-w', 'min-h', 'max-w', 'max-h', 'basis',
].join('|');

const OFFENCES: ReadonlyArray<readonly [string, RegExp]> = [
  [
    "a colour from Tailwind's own palette, which is cleared",
    new RegExp(`\\b(?:bg|text|border|ring|outline|fill|stroke|divide|placeholder|caret|accent|from|via|to)-(?:${PALETTE})(?:-\\d{1,3})?\\b`, 'g'),
  ],
  [
    'a numeric spacing step, which is cleared — only the named scale exists',
    // `0` survives deliberately: `--spacing-0` is named so the zero utilities
    // work, which is the NONET-19 fix. Everything else on that axis does not.
    new RegExp(`(?<![\\w-])-?(?:${SPACED})-(?!0(?![\\d.]))\\d+(?:\\.\\d+)?(?![\\w-])`, 'g'),
  ],
  [
    "a default breakpoint — this product has only `drawer:` and `rail:`",
    /(?<![\w-])(?:sm|md|lg|xl|2xl):/g,
  ],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('cleared Tailwind namespaces', () => {
  const files = sourceFiles(SRC);

  it('finds the source to scan', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(OFFENCES)('no source file uses %s', (_why, pattern) => {
    const found: string[] = [];

    for (const file of files) {
      for (const [index, line] of readFileSync(file, 'utf8').split('\n').entries()) {
        // Comments are prose in this codebase and routinely name the very
        // classes this test forbids, in order to explain why they are absent.
        if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) continue;

        for (const match of line.matchAll(new RegExp(pattern))) {
          found.push(`${file.slice(SRC.length + 1)}:${index + 1}  ${match[0]}`);
        }
      }
    }

    expect(found).toEqual([]);
  });

  /* The guard has to be able to fail, or it is decoration. */
  it('would catch the classes it forbids', () => {
    const samples = ['bg-red-500 text-white', 'fixed inset-4 p-4', 'md:flex'];

    for (const [index, sample] of samples.entries()) {
      expect(sample).toMatch(new RegExp(OFFENCES[index]![1]));
    }
  });

  /* And it must not fire on the vocabulary the product actually uses. */
  it('passes the token utilities', () => {
    const legitimate =
      'bg-surface text-fg2 border-line px-ml gap-s inset-0 p-0 drawer:grid-cols-2 rail:px-4xl z-40 grid-cols-4 max-w-[52ch] min-h-(--tap-target-min)';

    for (const [, pattern] of OFFENCES) {
      expect(legitimate).not.toMatch(new RegExp(pattern));
    }
  });
});
