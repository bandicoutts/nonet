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
} from './types.js';
export { CELL_COUNT, DIFFICULTIES, DIGITS, UNIT_SIZE } from './types.js';

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
} from './grid.js';

export { ALL_UNITS, BOXES, COLS, PEERS, ROWS, UNITS_OF } from './units.js';
export type { Unit } from './units.js';

export { canPlace, conflictsAt, findConflicts, isComplete, isLegal, isSolved } from './validate.js';

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
} from './candidates.js';

export { analyse, easiestCell, solveHumanly } from './solver/index.js';
export type { EasiestCell, SolveReport } from './solver/index.js';
export { MAX_RANK, TECHNIQUE_ORDER, TECHNIQUE_WEIGHTS, rankOf } from './solver/step.js';
export type { Elimination, Placement, Reduction, Step, Technique } from './solver/step.js';
export type { SolverState, TechniqueFinder } from './solver/state.js';

export { countSolutions, hasUniqueSolution, solveByBacktracking } from './uniqueness.js';

export {
  SCORE_FLOORS,
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForScore,
  rate,
  scoreOf,
} from './difficulty.js';

export {
  GIVEN_TOLERANCE,
  MAX_ATTEMPTS,
  digToTarget,
  generatePuzzle,
  generateSolution,
} from './generate.js';
export type { GeneratedPuzzle } from './generate.js';

export { createRng } from './rng.js';
export type { Rng } from './rng.js';

export {
  clearNotesAt,
  clearPeerNotes,
  emptyNotes,
  notesAt,
  setNotesAt,
  toggleNote,
} from './rules/notes.js';

export {
  MAX_MISTAKES,
  createMistakeTracker,
  loadDigit,
  recordWrongPlacement,
  releaseContainment,
} from './rules/mistakes.js';
export type { InputMode, MistakeTracker } from './rules/mistakes.js';

export { MAX_HINTS, chooseHint, hintNeedsConfirmation } from './rules/hints.js';
export type { Hint } from './rules/hints.js';

export { apply, createSession } from './rules/session.js';
export type { Action, SessionOptions, SessionState, SessionStatus } from './rules/session.js';
