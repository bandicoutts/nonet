/**
 * There is no border radius anywhere in Nonet. Every corner is square — it is
 * part of the cool, architectural Swiss language, not an omission. The token
 * exists so a component can reference it rather than hardcoding a zero.
 */
export const RADIUS = {
  none: 0,
} as const;

export type RadiusToken = keyof typeof RADIUS;
