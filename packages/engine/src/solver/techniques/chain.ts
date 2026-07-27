import { hasCandidate } from '../../candidates';
import { CELL_COUNT, DIGITS } from '../../types';
import type { CellIndex, Digit } from '../../types';
import { ALL_UNITS, PEERS } from '../../units';
import type { SolverState } from '../state';
import { reduction } from '../step';
import type { Elimination, Step } from '../step';
import { cellsFor } from './lockedCandidates';

type Colour = 0 | 1;

/**
 * A conjugate pair: a unit where a digit fits exactly two cells. One of them
 * holds the digit, so the two cells are opposites — the link every chain is
 * built from.
 */
function conjugateLinks(state: SolverState, digit: Digit): Map<CellIndex, CellIndex[]> {
  const links = new Map<CellIndex, CellIndex[]>();

  for (const unit of ALL_UNITS) {
    const cells = cellsFor(state, unit, digit);
    if (cells.length !== 2) continue;

    const [a, b] = cells as [CellIndex, CellIndex];
    links.set(a, [...(links.get(a) ?? []), b]);
    links.set(b, [...(links.get(b) ?? []), a]);
  }

  return links;
}

/** Two-colour a connected component of the link graph, breadth first. */
function colourComponent(
  start: CellIndex,
  links: Map<CellIndex, CellIndex[]>,
  colours: Map<CellIndex, Colour>,
): CellIndex[] {
  const component: CellIndex[] = [];
  const queue: CellIndex[] = [start];
  colours.set(start, 0);

  while (queue.length > 0) {
    const cell = queue.shift();
    if (cell === undefined) continue;
    component.push(cell);

    const colour = colours.get(cell) ?? 0;
    for (const next of links.get(cell) ?? []) {
      if (colours.has(next)) continue;
      colours.set(next, colour === 0 ? 1 : 0);
      queue.push(next);
    }
  }

  return component;
}

function sees(cell: CellIndex, others: readonly CellIndex[]): boolean {
  const peers = PEERS[cell] ?? [];
  return others.some((other) => peers.includes(other));
}

/**
 * Simple colouring. Chains of conjugate pairs are two-coloured, then:
 *
 * - if two cells of the same colour see each other, that colour cannot be the
 *   true one, so the digit is cleared from every cell wearing it;
 * - any cell outside the chain that sees both colours cannot hold the digit,
 *   because one of the two colours is true whichever way the chain resolves.
 */
export function findChain(state: SolverState): Step | null {
  for (const digit of DIGITS) {
    const links = conjugateLinks(state, digit);
    if (links.size === 0) continue;

    const colours = new Map<CellIndex, Colour>();

    for (const start of links.keys()) {
      if (colours.has(start)) continue;
      const component = colourComponent(start, links, colours);
      if (component.length < 3) continue;

      const groups: [CellIndex[], CellIndex[]] = [[], []];
      for (const cell of component) groups[colours.get(cell) ?? 0].push(cell);

      // Rule 1 — a colour that contradicts itself is false throughout.
      for (const colour of [0, 1] as const) {
        const group = groups[colour];
        const clashes = group.some((cell) => sees(cell, group.filter((other) => other !== cell)));
        if (!clashes) continue;

        const step = reduction(
          'chain',
          group.map((cell) => ({ cell, digit })),
        );
        if (step !== null) return step;
      }

      // Rule 2 — a cell seeing both colours cannot hold the digit.
      const inChain = new Set(component);
      const eliminations: Elimination[] = [];

      for (let cell = 0; cell < CELL_COUNT; cell += 1) {
        if (inChain.has(cell)) continue;
        if (state.grid[cell] !== 0) continue;
        if (!hasCandidate(state.candidates[cell] ?? 0, digit)) continue;
        if (sees(cell, groups[0]) && sees(cell, groups[1])) eliminations.push({ cell, digit });
      }

      const step = reduction('chain', eliminations);
      if (step !== null) return step;
    }
  }
  return null;
}
