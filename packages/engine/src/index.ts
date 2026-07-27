/**
 * @nonet/engine — the sudoku rules, in one place.
 *
 * Pure TypeScript: no DOM, no framework, no runtime dependencies. The UI
 * depends on this package; this package never depends on the UI.
 */

export type {
  CandidateMask,
  CellIndex,
  CellValue,
  Difficulty,
  Digit,
  Grid,
  MutableGrid,
  Notes,
} from './types';
export { CELL_COUNT, DIFFICULTIES, DIGITS, UNIT_SIZE } from './types';

export {
  boxOf,
  cellAt,
  cloneGrid,
  colOf,
  emptyCells,
  emptyGrid,
  filledCount,
  formatGrid,
  getCell,
  isEmptyAt,
  parseGrid,
  rowOf,
  setCell,
} from './grid';

export { ALL_UNITS, BOXES, COLS, PEERS, ROWS, UNITS_OF } from './units';
export type { Unit } from './units';

export { canPlace, conflictsAt, findConflicts, isComplete, isLegal, isSolved } from './validate';

export {
  ALL_CANDIDATES,
  computeCandidates,
  countCandidates,
  digitsOf,
  hasCandidate,
  maskOf,
  removeCandidate,
  singleCandidate,
  toggleCandidate,
  withCandidate,
} from './candidates';

export { analyse, easiestCell, solveHumanly } from './solver/index';
export type { EasiestCell, SolveReport } from './solver/index';
export { MAX_RANK, TECHNIQUE_ORDER, TECHNIQUE_WEIGHTS, rankOf } from './solver/step';
export type { Elimination, Placement, Reduction, Step, Technique } from './solver/step';
export type { SolverState, TechniqueFinder } from './solver/state';

export { countSolutions, hasUniqueSolution, solveByBacktracking } from './uniqueness';

export {
  SCORE_FLOORS,
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForScore,
  rate,
  scoreOf,
} from './difficulty';

export {
  GIVEN_TOLERANCE,
  MAX_ATTEMPTS,
  digToTarget,
  generatePuzzle,
  generateSolution,
} from './generate';
export type { GeneratedPuzzle } from './generate';

export { createRng } from './rng';
export type { Rng } from './rng';

export {
  clearNotesAt,
  clearPeerNotes,
  emptyNotes,
  notesAt,
  setNotesAt,
  toggleNote,
} from './rules/notes';

export {
  MAX_MISTAKES,
  createMistakeTracker,
  loadDigit,
  recordWrongPlacement,
  releaseContainment,
} from './rules/mistakes';
export type { InputMode, MistakeTracker } from './rules/mistakes';

export { MAX_HINTS, chooseHint, hintNeedsConfirmation } from './rules/hints';
export type { Hint } from './rules/hints';

export { apply, createSession } from './rules/session';
export type {
  Action,
  Loaded,
  SessionOptions,
  SessionState,
  SessionStatus,
} from './rules/session';
