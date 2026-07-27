/**
 * The published 12-step spacing scale, in pixels.
 *
 * The prototype uses it loosely — `design/export/tokens.json` → `space.offScale`
 * lists 26 raw values in use (2, 3, 5, 7, 9, 10, 11, 13, 16, 22, 24, 28, 30, 32,
 * 36, 38, 40, 46, 48, 52, 56, 60, 64, 72, 100). Those are recorded there as
 * defects, not tokens, and are deliberately not exported here: the build snaps
 * to the scale rather than reproducing the drift.
 */
export const SPACE = {
  'space-3xs': 4,
  'space-2xs': 6,
  'space-xs': 8,
  'space-s': 12,
  'space-sm': 14,
  'space-m': 18,
  'space-ml': 20,
  'space-l': 26,
  'space-xl': 34,
  'space-2xl': 44,
  'space-3xl': 62,
  'space-4xl': 88,
} as const;

export type SpaceToken = keyof typeof SPACE;

/** The nearest scale step to a raw pixel value. Use when porting a measurement. */
export function nearestSpace(px: number): SpaceToken {
  const entries = Object.entries(SPACE) as Array<[SpaceToken, number]>;
  let best: SpaceToken = 'space-3xs';
  let bestDistance = Infinity;

  for (const [token, value] of entries) {
    const distance = Math.abs(value - px);
    if (distance < bestDistance) {
      best = token;
      bestDistance = distance;
    }
  }

  return best;
}

/** Minimum touch target, in pixels. */
export const TAP_TARGET_MIN = 44;
