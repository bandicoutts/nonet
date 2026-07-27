/**
 * WCAG 2.1 contrast maths.
 *
 * This lives in the token package on purpose. AA is a stated hard requirement
 * for Nonet, and the prototype shipped nine failures against it (DECISIONS.md
 * NONET-5) precisely because contrast was measured once, by hand, and written
 * into a JSON file. Here it is computed from the tokens themselves, so the
 * pairing tests fail the moment a colour moves.
 */

/** Normal text needs 4.5:1 at AA. */
export const AA_NORMAL_TEXT = 4.5;

/** Large text — 18.66px bold or 24px regular and above — needs 3:1 at AA. */
export const AA_LARGE_TEXT = 3;

const HEX = /^#?[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  if (!HEX.test(hex)) {
    throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
  }
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** Contrast ratio between two colours, 1:1 to 21:1. Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsAA(ratio: number, options: { large?: boolean } = {}): boolean {
  return ratio >= (options.large === true ? AA_LARGE_TEXT : AA_NORMAL_TEXT);
}
