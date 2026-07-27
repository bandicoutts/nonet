import type { CellIndex, Digit } from '../types.js';

/**
 * The solving techniques the engine knows, in the order it applies them.
 *
 * Order is difficulty order, and it is load-bearing: the solver always uses the
 * cheapest technique that makes progress, so the hardest technique a puzzle
 * forces is a stable property of that puzzle. The difficulty rater reads it,
 * the generator bounds digging by it, and hints rank cells by it. Reordering
 * this list re-rates every puzzle in the bank.
 */
export const TECHNIQUE_ORDER = [
  'nakedSingle',
  'hiddenSingle',
  'nakedPair',
  'hiddenPair',
  'nakedTriple',
  'pointingPair',
  'boxLine',
  'xWing',
  'chain',
] as const;

export type Technique = (typeof TECHNIQUE_ORDER)[number];

/** 1-based difficulty rank. Higher is harder. */
export function rankOf(technique: Technique): number {
  return TECHNIQUE_ORDER.indexOf(technique) + 1;
}

export const MAX_RANK = TECHNIQUE_ORDER.length;

/** A technique that determines a cell's digit outright. */
export interface Placement {
  readonly kind: 'placement';
  readonly technique: Technique;
  readonly cell: CellIndex;
  readonly digit: Digit;
}

export interface Elimination {
  readonly cell: CellIndex;
  readonly digit: Digit;
}

/** A technique that narrows candidates without placing anything. */
export interface Reduction {
  readonly kind: 'reduction';
  readonly technique: Technique;
  readonly eliminations: readonly Elimination[];
}

export type Step = Placement | Reduction;

export function placement(technique: Technique, cell: CellIndex, digit: Digit): Placement {
  return { kind: 'placement', technique, cell, digit };
}

/**
 * A reduction, or null when nothing would actually change. Returning null for
 * an empty elimination list is what keeps the solver loop from spinning on a
 * technique that "fires" but moves nothing.
 */
export function reduction(
  technique: Technique,
  eliminations: readonly Elimination[],
): Reduction | null {
  return eliminations.length > 0 ? { kind: 'reduction', technique, eliminations } : null;
}
