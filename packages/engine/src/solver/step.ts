import type { CellIndex, Digit } from '../types';

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

/**
 * What each deduction costs, in naked singles.
 *
 * A puzzle's difficulty is the summed weight of every step its solve requires,
 * so these numbers decide the bands. The shape is deliberate: subset techniques
 * are a small multiple of a single because they are found by reading one unit,
 * while X-wings and chains are a step change because they need a search across
 * units.
 *
 * **These weights are judgement, not measurement.** Calibrating them properly
 * needs human solve times, which will not exist until the product ships — so
 * the plan is to persist each puzzle's score, then re-derive these from real
 * completion times and re-band the bank with a script. The band thresholds in
 * `difficulty.ts` are measured against *these* weights: change a number here
 * and the thresholds must be recalibrated, or every puzzle silently re-rates.
 */
export const TECHNIQUE_WEIGHTS: Readonly<Record<Technique, number>> = {
  nakedSingle: 1,
  hiddenSingle: 2,
  nakedPair: 5,
  hiddenPair: 8,
  nakedTriple: 10,
  pointingPair: 12,
  boxLine: 14,
  xWing: 30,
  chain: 50,
};

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
