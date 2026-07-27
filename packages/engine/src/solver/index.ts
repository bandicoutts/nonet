import { computeCandidates, removeCandidate } from '../candidates';
import { cloneGrid, emptyCells } from '../grid';
import { countCandidates } from '../candidates';
import type { CandidateMask, CellIndex, Digit, Grid } from '../types';
import { PEERS } from '../units';
import { isSolved } from '../validate';
import { solveByBacktracking } from '../uniqueness';
import type { SolverState, TechniqueFinder } from './state';
import { TECHNIQUE_ORDER, TECHNIQUE_WEIGHTS, rankOf } from './step';
import type { Step, Technique } from './step';
import { findNakedSingle } from './techniques/nakedSingle';
import { findHiddenSingle } from './techniques/hiddenSingle';
import { findNakedPair } from './techniques/nakedPair';
import { findHiddenPair } from './techniques/hiddenPair';
import { findNakedTriple } from './techniques/nakedTriple';
import { findPointingPair } from './techniques/pointingPair';
import { findBoxLine } from './techniques/boxLine';
import { findXWing } from './techniques/xWing';
import { findChain } from './techniques/chain';

/** Finders in TECHNIQUE_ORDER. The solver always tries them in this order. */
const FINDERS: ReadonlyArray<readonly [Technique, TechniqueFinder]> = [
  ['nakedSingle', findNakedSingle],
  ['hiddenSingle', findHiddenSingle],
  ['nakedPair', findNakedPair],
  ['hiddenPair', findHiddenPair],
  ['nakedTriple', findNakedTriple],
  ['pointingPair', findPointingPair],
  ['boxLine', findBoxLine],
  ['xWing', findXWing],
  ['chain', findChain],
];

export interface SolveReport {
  /** Whether technique alone finished the grid. */
  readonly solved: boolean;
  /** The grid as far as the solver got. */
  readonly grid: Grid;
  /** Every step taken, in order. */
  readonly steps: readonly Step[];
  /** Rank of the hardest technique the solve required; 0 if none was needed. */
  readonly ceiling: number;
  /**
   * Summed weight of every step taken, in naked singles. This is the difficulty
   * signal — see `TECHNIQUE_WEIGHTS`. It counts the work actually done, so a
   * solve that ran out of technique still reports how far it got; callers that
   * want "unrateable" semantics should check `solved` too, as `scoreOf` does.
   */
  readonly score: number;
  readonly hardestTechnique: Technique | null;
  readonly counts: Readonly<Record<Technique, number>>;
}

function emptyCounts(): Record<Technique, number> {
  const counts = {} as Record<Technique, number>;
  for (const technique of TECHNIQUE_ORDER) counts[technique] = 0;
  return counts;
}

/**
 * Solve as a person would: apply the cheapest technique that makes progress,
 * repeat, and stop when nothing applies. Never guesses, so a report with
 * `solved: false` means the grid needs more than the techniques listed here —
 * not that it is unsolvable.
 */
export function analyse(grid: Grid): SolveReport {
  const working = cloneGrid(grid);
  const candidates = computeCandidates(grid);
  const steps: Step[] = [];
  const counts = emptyCounts();

  for (;;) {
    const state: SolverState = { grid: working, candidates };
    let progressed = false;

    for (const [technique, find] of FINDERS) {
      const step = find(state);
      if (step === null) continue;

      applyStep(working, candidates, step);
      steps.push(step);
      counts[technique] += 1;
      progressed = true;
      break;
    }

    if (!progressed) break;
  }

  const hardestTechnique = hardestOf(counts);
  let score = 0;
  for (const technique of TECHNIQUE_ORDER) {
    score += (counts[technique] ?? 0) * TECHNIQUE_WEIGHTS[technique];
  }

  return {
    solved: isSolved(working),
    grid: working,
    steps,
    ceiling: hardestTechnique === null ? 0 : rankOf(hardestTechnique),
    score,
    hardestTechnique,
    counts,
  };
}

function hardestOf(counts: Record<Technique, number>): Technique | null {
  let hardest: Technique | null = null;
  for (const technique of TECHNIQUE_ORDER) {
    if ((counts[technique] ?? 0) > 0) hardest = technique;
  }
  return hardest;
}

function applyStep(grid: Digit[] | Grid, candidates: CandidateMask[], step: Step): void {
  const mutable = grid as (0 | Digit)[];

  if (step.kind === 'placement') {
    mutable[step.cell] = step.digit;
    candidates[step.cell] = 0;
    for (const peer of PEERS[step.cell] ?? []) {
      candidates[peer] = removeCandidate(candidates[peer] ?? 0, step.digit);
    }
    return;
  }

  for (const { cell, digit } of step.eliminations) {
    candidates[cell] = removeCandidate(candidates[cell] ?? 0, digit);
  }
}

/** The solution when technique alone reaches it, otherwise null. */
export function solveHumanly(grid: Grid): Grid | null {
  const report = analyse(grid);
  return report.solved ? report.grid : null;
}

export interface EasiestCell {
  readonly cell: CellIndex;
  readonly digit: Digit;
  /** The technique that resolves it. */
  readonly technique: Technique;
  readonly rank: number;
}

/**
 * The unfilled cell a player could reasonably crack next: the first cell the
 * human solver places, which — because the solver always reaches for the
 * cheapest technique first — is the one requiring the least work.
 *
 * Hints use this when no cell is selected. It falls back to the most
 * constrained empty cell when deduction cannot place anything at all, so a hint
 * always has somewhere to go even on a grid the player has painted into a
 * corner.
 */
export function easiestCell(grid: Grid): EasiestCell | null {
  const report = analyse(grid);

  for (const step of report.steps) {
    if (step.kind === 'placement') {
      return {
        cell: step.cell,
        digit: step.digit,
        technique: step.technique,
        rank: rankOf(step.technique),
      };
    }
  }

  return fallbackCell(grid);
}

function fallbackCell(grid: Grid): EasiestCell | null {
  const open = emptyCells(grid);
  if (open.length === 0) return null;

  const solution = solveByBacktracking(grid);
  if (solution === null) return null;

  const candidates = computeCandidates(grid);
  let best: CellIndex | null = null;
  let bestCount = 10;

  for (const cell of open) {
    const count = countCandidates(candidates[cell] ?? 0);
    if (count > 0 && count < bestCount) {
      best = cell;
      bestCount = count;
    }
  }

  const cell = best ?? open[0];
  if (cell === undefined) return null;

  const digit = solution[cell];
  if (digit === undefined || digit === 0) return null;

  // No technique in the ladder resolves it; report the hardest so callers
  // ranking cells by effort do not mistake a guess-level cell for a cheap one.
  return { cell, digit, technique: 'chain', rank: rankOf('chain') };
}
