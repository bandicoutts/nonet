import type { ThemeName } from './color';

/**
 * The only drop shadow in the product, on the confirmation dialog.
 *
 * **Themed, unlike the export.** The prototype used one raw
 * `rgba(0,0,0,.14)` in both themes. Over the light scrim that darkens by
 * ΔL\* 11.7; over the dark scrim (`--veil` `#15181B`, already L\* 8.1) the same
 * alpha manages ΔL\* 1.5 — effectively invisible.
 *
 * Dark cannot match light here at any alpha: pure black over that scrim tops
 * out at ΔL\* 8.1. So 0.55 is chosen as the most a shadow can usefully
 * contribute (ΔL\* 5.1) before it reads as a hard vignette rather than depth.
 *
 * The consequence is worth knowing when building the dialog: **in dark the
 * panel is separated by its `--rule` border, not by this shadow.** The shadow
 * is a supporting cue there, not the primary one.
 *
 * See DECISIONS.md NONET-7.
 */
export const SHADOWS: Readonly<Record<ThemeName, Readonly<Record<'elevation', string>>>> = {
  light: {
    elevation: '0 24px 60px rgba(0, 0, 0, 0.14)',
  },
  dark: {
    elevation: '0 24px 60px rgba(0, 0, 0, 0.55)',
  },
};

export type ShadowToken = keyof (typeof SHADOWS)['light'];
