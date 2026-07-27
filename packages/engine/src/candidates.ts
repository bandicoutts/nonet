import { CELL_COUNT, DIGITS } from './types';
import type { CandidateMask, Digit, Grid } from './types';
import { PEERS } from './units';

/** Every digit 1-9. */
export const ALL_CANDIDATES: CandidateMask = 0b111_111_111;

export const NO_CANDIDATES: CandidateMask = 0;

export function bitOf(digit: Digit): CandidateMask {
  return 1 << (digit - 1);
}

export function maskOf(digits: Iterable<Digit>): CandidateMask {
  let mask = NO_CANDIDATES;
  for (const digit of digits) mask |= bitOf(digit);
  return mask;
}

export function digitsOf(mask: CandidateMask): Digit[] {
  const digits: Digit[] = [];
  for (const digit of DIGITS) {
    if ((mask & bitOf(digit)) !== 0) digits.push(digit);
  }
  return digits;
}

export function hasCandidate(mask: CandidateMask, digit: Digit): boolean {
  return (mask & bitOf(digit)) !== 0;
}

export function withCandidate(mask: CandidateMask, digit: Digit): CandidateMask {
  return mask | bitOf(digit);
}

export function removeCandidate(mask: CandidateMask, digit: Digit): CandidateMask {
  return mask & ~bitOf(digit);
}

export function toggleCandidate(mask: CandidateMask, digit: Digit): CandidateMask {
  return mask ^ bitOf(digit);
}

export function countCandidates(mask: CandidateMask): number {
  let count = 0;
  let bits = mask;
  while (bits !== 0) {
    bits &= bits - 1;
    count += 1;
  }
  return count;
}

/** The digit, when the mask holds exactly one; otherwise null. */
export function singleCandidate(mask: CandidateMask): Digit | null {
  if (countCandidates(mask) !== 1) return null;
  return (31 - Math.clz32(mask) + 1) as Digit;
}

/**
 * Basic candidates for every cell: for an empty cell, the digits no peer uses;
 * for a filled cell, none. This is the solver's starting point — techniques
 * narrow it further.
 */
export function computeCandidates(grid: Grid): CandidateMask[] {
  const candidates = new Array<CandidateMask>(CELL_COUNT).fill(NO_CANDIDATES);

  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (grid[index] !== 0) continue;

    let mask = ALL_CANDIDATES;
    for (const peer of PEERS[index] ?? []) {
      const value = grid[peer];
      if (value !== undefined && value !== 0) mask = removeCandidate(mask, value);
    }
    candidates[index] = mask;
  }

  return candidates;
}
