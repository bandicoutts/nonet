/** A placeable sudoku digit. */
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** The contents of a cell: a digit, or 0 for empty. */
export type CellValue = 0 | Digit;

/** A cell's position, 0-80, in reading order. */
export type CellIndex = number;

/** A 9x9 board as 81 cells in reading order. */
export type Grid = readonly CellValue[];

/** A mutable working board. Prefer `Grid` at API boundaries. */
export type MutableGrid = CellValue[];

/**
 * A set of candidate digits packed into the low 9 bits: digit `d` occupies bit
 * `d - 1`. Bitmasks keep the solver's inner loops allocation-free.
 */
export type CandidateMask = number;

/** Notes (pencil marks) for every cell, as candidate masks. */
export type Notes = readonly CandidateMask[];

export const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const CELL_COUNT = 81;
export const UNIT_SIZE = 9;
export const BOX_SIZE = 3;

/** The four player-facing difficulty bands. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
