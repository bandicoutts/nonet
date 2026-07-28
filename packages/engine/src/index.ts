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
} from './types.ts';
export { CELL_COUNT, DIFFICULTIES, DIGITS, UNIT_SIZE } from './types.ts';

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
} from './grid.ts';

export { ALL_UNITS, BOXES, COLS, PEERS, ROWS, UNITS_OF } from './units.ts';
export type { Unit } from './units.ts';

export {
  canPlace,
  conflictsAt,
  findConflicts,
  hasConflictAt,
  isComplete,
  isLegal,
  isSolved,
} from './validate.ts';

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
} from './candidates.ts';

export { analyse, easiestCell, solveHumanly } from './solver/index.ts';
export type { EasiestCell, SolveReport } from './solver/index.ts';
export { MAX_RANK, TECHNIQUE_ORDER, TECHNIQUE_WEIGHTS, rankOf } from './solver/step.ts';
export type { Elimination, Placement, Reduction, Step, Technique } from './solver/step.ts';
export type { SolverState, TechniqueFinder } from './solver/state.ts';

export { countSolutions, hasUniqueSolution, solveByBacktracking } from './uniqueness.ts';

export {
  SCORE_FLOORS,
  TARGET_GIVENS,
  TECHNIQUE_CEILINGS,
  bandForScore,
  rate,
  scoreOf,
} from './difficulty.ts';

export {
  GIVEN_TOLERANCE,
  MAX_ATTEMPTS,
  digToTarget,
  generatePuzzle,
  generateSolution,
} from './generate.ts';
export type { GeneratedPuzzle } from './generate.ts';

export { createRng } from './rng.ts';
export type { Rng } from './rng.ts';

export {
  clearNotesAt,
  clearPeerNotes,
  emptyNotes,
  notesAt,
  setNotesAt,
  toggleNote,
} from './rules/notes.ts';

export {
  MAX_MISTAKES,
  createMistakeTracker,
  loadDigit,
  recordWrongPlacement,
  releaseContainment,
} from './rules/mistakes.ts';
export type { InputMode, MistakeTracker } from './rules/mistakes.ts';

export { MAX_HINTS, chooseHint, hintNeedsConfirmation } from './rules/hints.ts';
export type { Hint } from './rules/hints.ts';

export {
  DAILY_RHYTHM,
  PUBLISH_MINUTE,
  PUZZLE_EPOCH,
  currentEdition,
  dailyDifficulty,
  dailySeed,
  puzzleNumber,
} from './daily.ts';
export type { Weekday } from './daily.ts';

export { apply, createSession, restoreSession } from './rules/session.ts';
export type {
  Action,
  Loaded,
  RestoreOptions,
  SessionOptions,
  SessionState,
  SessionStatus,
} from './rules/session.ts';
