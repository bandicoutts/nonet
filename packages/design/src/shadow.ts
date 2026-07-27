/**
 * The only drop shadow in the product, on the confirmation dialog.
 *
 * **Known defect, unresolved:** the export records this as a raw
 * `rgba(0,0,0,.14)` that does not re-tone in dark, where the same black alpha
 * reads as almost nothing against `--bg` `#131518`. Transcribed as measured
 * rather than silently re-authored — picking a dark value is a design decision,
 * not a transcription. See `design/README.md` → Theming.
 */
export const SHADOWS = {
  elevation: '0 24px 60px rgba(0, 0, 0, 0.14)',
} as const;

export type ShadowToken = keyof typeof SHADOWS;
