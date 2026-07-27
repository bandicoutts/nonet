import { describe, expect, test } from 'vitest';
import { formatGrid, parseGrid } from '../src/grid.js';
import { analyse, easiestCell, solveHumanly } from '../src/solver/index.js';
import { MAX_RANK, TECHNIQUE_ORDER, rankOf } from '../src/solver/step.js';
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION, TWO_SOLUTION_PUZZLE } from './fixtures.js';

describe('technique order', () => {
  test('runs cheapest first, singles before subsets before fish before chains', () => {
    expect([...TECHNIQUE_ORDER]).toEqual([
      'nakedSingle',
      'hiddenSingle',
      'nakedPair',
      'hiddenPair',
      'nakedTriple',
      'pointingPair',
      'boxLine',
      'xWing',
      'chain',
    ]);
  });

  test('ranks are 1-based and ascend with difficulty', () => {
    expect(rankOf('nakedSingle')).toBe(1);
    expect(rankOf('chain')).toBe(MAX_RANK);
    expect(rankOf('nakedPair')).toBeLessThan(rankOf('xWing'));
  });
});

describe('analyse', () => {
  test('solves a well-formed puzzle and reports the solution', () => {
    const report = analyse(parseGrid(CLASSIC_PUZZLE));
    expect(report.solved).toBe(true);
    expect(formatGrid(report.grid)).toBe(CLASSIC_SOLUTION);
  });

  test('reports which techniques the solve needed', () => {
    const report = analyse(parseGrid(CLASSIC_PUZZLE));
    expect(report.counts.nakedSingle + report.counts.hiddenSingle).toBeGreaterThan(0);
    expect(report.hardestTechnique).not.toBeNull();
    expect(report.ceiling).toBe(rankOf(report.hardestTechnique ?? 'nakedSingle'));
  });

  test('the canonical puzzle needs nothing harder than a hidden single', () => {
    expect(analyse(parseGrid(CLASSIC_PUZZLE)).ceiling).toBeLessThanOrEqual(rankOf('hiddenSingle'));
  });

  test('an already solved grid needs no steps', () => {
    const report = analyse(parseGrid(CLASSIC_SOLUTION));
    expect(report.solved).toBe(true);
    expect(report.steps).toHaveLength(0);
    expect(report.ceiling).toBe(0);
    expect(report.hardestTechnique).toBeNull();
  });

  test('gives up rather than guessing when logic runs out', () => {
    // Two solutions exist, so no amount of deduction can finish this.
    const report = analyse(parseGrid(TWO_SOLUTION_PUZZLE));
    expect(report.solved).toBe(false);
  });

  test('is deterministic — the same grid yields the same steps every time', () => {
    const first = analyse(parseGrid(CLASSIC_PUZZLE));
    const second = analyse(parseGrid(CLASSIC_PUZZLE));
    expect(second.steps).toEqual(first.steps);
    expect(second.ceiling).toBe(first.ceiling);
  });

  test('leaves the caller grid untouched', () => {
    const grid = parseGrid(CLASSIC_PUZZLE);
    analyse(grid);
    expect(formatGrid(grid)).toBe(CLASSIC_PUZZLE);
  });
});

describe('solveHumanly', () => {
  test('returns the solution when technique alone suffices', () => {
    expect(formatGrid(solveHumanly(parseGrid(CLASSIC_PUZZLE)) ?? [])).toBe(CLASSIC_SOLUTION);
  });

  test('returns null when it cannot finish without guessing', () => {
    expect(solveHumanly(parseGrid(TWO_SOLUTION_PUZZLE))).toBeNull();
  });
});

describe('easiestCell', () => {
  test('names an empty cell and the digit that belongs there', () => {
    const easiest = easiestCell(parseGrid(CLASSIC_PUZZLE));
    expect(easiest).not.toBeNull();
    expect(CLASSIC_SOLUTION[easiest?.cell ?? -1]).toBe(String(easiest?.digit));
  });

  test('reports the technique that resolves it, so hints can rank cells', () => {
    const easiest = easiestCell(parseGrid(CLASSIC_PUZZLE));
    expect(TECHNIQUE_ORDER).toContain(easiest?.technique);
  });

  test('prefers a cell resolvable by the cheapest technique available', () => {
    // This puzzle has naked singles, so the easiest cell must be one of them.
    const easiest = easiestCell(parseGrid(CLASSIC_PUZZLE));
    expect(easiest?.technique).toBe('nakedSingle');
  });

  test('returns null for a full grid', () => {
    expect(easiestCell(parseGrid(CLASSIC_SOLUTION))).toBeNull();
  });

  test('still names a cell when deduction alone cannot finish the grid', () => {
    const easiest = easiestCell(parseGrid(TWO_SOLUTION_PUZZLE));
    expect(easiest).not.toBeNull();
  });
});
