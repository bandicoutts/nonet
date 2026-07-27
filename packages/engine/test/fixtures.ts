/**
 * Shared test fixtures. Grids are 81-char strings, '.' for empty, read in
 * reading order (row 0 left-to-right, then row 1, ...).
 */

/**
 * The canonical Wikipedia sudoku. Unique solution, and it falls to singles
 * alone — but with only 30 givens it rates Hard, because given count is the
 * primary axis of the rater. Named for what it is rather than for a band.
 */
export const CLASSIC_PUZZLE =
  '53..7....' +
  '6..195...' +
  '.98....6.' +
  '8...6...3' +
  '4..8.3..1' +
  '7...2...6' +
  '.6....28.' +
  '...419..5' +
  '....8..79';

export const CLASSIC_SOLUTION =
  '534678912' +
  '672195348' +
  '198342567' +
  '859761423' +
  '426853791' +
  '713924856' +
  '961537284' +
  '287419635' +
  '345286179';

/**
 * CLASSIC_SOLUTION with every 1 and 2 blanked. Any solution can have all its 1s
 * and 2s swapped for another, so this provably has more than one solution —
 * a deliberate fixture, because simply deleting a given from a well-formed
 * puzzle usually leaves it unique.
 */
export const TWO_SOLUTION_PUZZLE =
  '5346789..' +
  '67..95348' +
  '.9834.567' +
  '85976.4.3' +
  '4.685379.' +
  '7.39.4856' +
  '96.537.84' +
  '.874.9635' +
  '345.86.79';

/** CLASSIC_PUZZLE with the 5 at cell 0 removed. Still uniquely solvable. */
export const CLASSIC_MINUS_ONE_GIVEN =
  '.3..7....' +
  '6..195...' +
  '.98....6.' +
  '8...6...3' +
  '4..8.3..1' +
  '7...2...6' +
  '.6....28.' +
  '...419..5' +
  '....8..79';

/** No solution: two 5s in the top-left box. */
export const CONTRADICTORY_PUZZLE =
  '5.......5' +
  '.........' +
  '.........' +
  '.........' +
  '.........' +
  '.........' +
  '.........' +
  '.........' +
  '.........';

export const EMPTY_PUZZLE = '.'.repeat(81);

/** Row 0 holds 1-8, so cell 8 can only be 9. */
export const NAKED_SINGLE_GRID =
  '12345678.' +
  '.'.repeat(72);

/**
 * Digit 5 is barred from every cell of box 0 except cell 0: row 1 and row 2
 * each carry a 5 outside the box, and columns 1 and 2 carry one below it.
 * Cell 0 still takes any digit, so this is a hidden single, not a naked one.
 */
export const HIDDEN_SINGLE_GRID =
  '.........' +
  '...5.....' +
  '......5..' +
  '.5.......' +
  '.........' +
  '.........' +
  '..5......' +
  '.........' +
  '.........';
