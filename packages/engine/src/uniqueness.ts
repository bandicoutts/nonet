import { computeCandidates, countCandidates, digitsOf, removeCandidate } from './candidates';
import { cloneGrid } from './grid';
import { CELL_COUNT } from './types';
import type { CandidateMask, CellIndex, Digit, Grid, MutableGrid } from './types';
import { PEERS } from './units';
import { isLegal } from './validate';

/**
 * Backtracking search over a live candidate table. This is the ground truth for
 * "does this grid have exactly one solution" — the human solver cannot answer
 * that, because a puzzle it fails to crack may still be uniquely solvable.
 *
 * Cells are chosen most-constrained-first, which prunes hard and keeps the
 * empty-board case fast.
 */
class Search {
  private readonly grid: MutableGrid;
  private readonly candidates: CandidateMask[];

  constructor(grid: Grid) {
    this.grid = cloneGrid(grid);
    this.candidates = computeCandidates(grid);
  }

  /**
   * A grid is only worth searching if the digits already placed do not clash
   * and every empty cell still has somewhere to go. The clash check matters:
   * candidate tables are derived from peers and say nothing about two givens
   * contradicting each other, so without it an impossible grid sends the search
   * through the entire space before concluding nothing fits.
   */
  private isViable(): boolean {
    if (!isLegal(this.grid)) return false;

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (this.grid[index] === 0 && this.candidates[index] === 0) return false;
    }
    return true;
  }

  private nextCell(): CellIndex | null {
    let best: CellIndex | null = null;
    let bestCount = 10;

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (this.grid[index] !== 0) continue;
      const count = countCandidates(this.candidates[index] ?? 0);
      if (count < bestCount) {
        best = index;
        bestCount = count;
        if (count <= 1) break;
      }
    }

    return best;
  }

  /** Place a digit and strip it from every peer. Returns an undo record. */
  private place(index: CellIndex, digit: Digit): { index: CellIndex; touched: CellIndex[] } {
    const touched: CellIndex[] = [];
    this.grid[index] = digit;

    for (const peer of PEERS[index] ?? []) {
      const mask = this.candidates[peer] ?? 0;
      const stripped = removeCandidate(mask, digit);
      if (stripped !== mask) {
        this.candidates[peer] = stripped;
        touched.push(peer);
      }
    }

    return { index, touched };
  }

  private undo(record: { index: CellIndex; touched: CellIndex[] }, digit: Digit): void {
    this.grid[record.index] = 0;
    for (const peer of record.touched) {
      this.candidates[peer] = (this.candidates[peer] ?? 0) | (1 << (digit - 1));
    }
  }

  /** Depth-first count, stopping as soon as `cap` solutions have been seen. */
  private walk(cap: number, found: Grid[]): void {
    if (found.length >= cap) return;

    const index = this.nextCell();
    if (index === null) {
      found.push(cloneGrid(this.grid));
      return;
    }

    const mask = this.candidates[index] ?? 0;
    const ownMask = mask;
    for (const digit of digitsOf(ownMask)) {
      const record = this.place(index, digit);
      this.candidates[index] = 0;
      this.walk(cap, found);
      this.candidates[index] = ownMask;
      this.undo(record, digit);
      if (found.length >= cap) return;
    }
  }

  run(cap: number): Grid[] {
    if (!this.isViable()) return [];
    const found: Grid[] = [];
    this.walk(cap, found);
    return found;
  }
}

/**
 * How many solutions the grid has, counted up to `cap`. A cap keeps the search
 * bounded — an empty board has 6.67e21 solutions and we only ever need to know
 * whether the count is 0, 1 or "more than 1".
 */
export function countSolutions(grid: Grid, cap = 2): number {
  return new Search(grid).run(cap).length;
}

/** The first solution found, or null if the grid is unsolvable. */
export function solveByBacktracking(grid: Grid): Grid | null {
  return new Search(grid).run(1)[0] ?? null;
}

/**
 * Exactly one solution. Every puzzle Nonet ships must satisfy this — it is
 * stated in the product copy, so it is enforced at generation time and
 * re-checked before a puzzle is handed out.
 */
export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}
