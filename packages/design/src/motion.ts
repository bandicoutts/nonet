/**
 * Motion, transcribed from `design/export/tokens.json` → `motion`.
 * Durations are milliseconds.
 */
export const MOTION = {
  duration: {
    /** Background and colour on outline buttons, links and rows. */
    hover: 150,
    /** A digit or hint landing in a cell: scale .7 to 1, opacity 0 to 1. */
    place: 180,
    /** The solved grid settling on the result screen: 7px rise, fade in. */
    reveal: 420,
    /** How long the Copied confirmation stays. */
    'toast-dwell': 1800,
    /** The Copied confirmation fading in and out. */
    'toast-in-out': 150,
  },
  easing: {
    hover: 'ease',
    place: 'cubic-bezier(.2,.8,.3,1)',
    reveal: 'cubic-bezier(.2,.8,.3,1)',
    toast: 'ease',
  },
  /**
   * Under `prefers-reduced-motion: reduce` every duration collapses to this.
   * The Tokens screen says 1ms and the prototype stylesheet says .001ms; the
   * Tokens screen is the authority and 1ms is equally imperceptible.
   *
   * Reduced motion removes movement, not feedback: hover still changes colour,
   * a placed digit is simply there without scaling, and the toast still dwells.
   */
  reducedMotionDuration: 1,
} as const;

export type MotionDuration = keyof typeof MOTION.duration;
export type MotionEasing = keyof typeof MOTION.easing;

/**
 * Known defects in the prototype's motion, recorded so the build fixes them
 * rather than reproducing them (`design/README.md`):
 *
 * - `motion-place` is published and a `nonetPop` keyframe exists, but nothing
 *   references it, so placed digits and hints do not animate at all.
 * - The Copied toast dwell is a bare `setTimeout` and the fade is unimplemented.
 * - Pad keys and archive rows use a 120ms transition, which is not a token.
 */
export const MOTION_DEFECTS = [
  'motion-place is unwired — placed digits and hints do not animate',
  'toast fade is unimplemented; only the dwell exists',
  '120ms pad-key and archive-row transitions are off-token — use motion.duration.hover',
] as const;
