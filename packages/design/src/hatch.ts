/**
 * The 45-degree hatch on a spent pad key: 1px on, 5px off.
 *
 * This is the **non-colour cue** that lets a spent key read as unavailable
 * without relying on reduced contrast alone, which is what keeps `--fg3` inside
 * the WCAG exemption for disabled controls (GAME-RULES.md, DECISIONS.md
 * NONET-5). Removing it would make the low contrast a real failure.
 */
export const HATCH = {
  'spent-key': 'repeating-linear-gradient(45deg, var(--line2) 0 1px, transparent 1px 5px)',
} as const;

export type HatchToken = keyof typeof HATCH;
