# @nonet/engine

The sudoku rules, in one place. Pure TypeScript — no DOM, no framework, no
runtime dependencies. The UI depends on this package; this package never depends
on the UI.

```ts
import { generatePuzzle, createSession, apply } from '@nonet/engine';

const puzzle = generatePuzzle('hard', 20260727);
let session = createSession({ givens: puzzle.givens, solution: puzzle.solution });
session = apply(session, { type: 'placeDigit', cell: 2, digit: 4 });
```

## Board representation

A `Grid` is 81 `CellValue`s in reading order — row 0 left to right, then row 1.
`0` means empty. Grids are immutable at API boundaries; every mutator returns a
new grid.

| Function | Purpose |
| --- | --- |
| `parseGrid(string)` / `formatGrid(grid)` | 81-char strings, `.` or `0` for empty; whitespace ignored on parse |
| `emptyGrid()`, `cloneGrid`, `getCell`, `setCell`, `isEmptyAt` | construction and access |
| `rowOf`, `colOf`, `boxOf`, `cellAt` | coordinates |
| `filledCount`, `emptyCells` | counting |
| `ROWS`, `COLS`, `BOXES`, `ALL_UNITS`, `UNITS_OF`, `PEERS` | precomputed index tables |

Candidates are 9-bit masks (`digit d` occupies bit `d - 1`) so the solver's inner
loops allocate nothing: `maskOf`, `digitsOf`, `hasCandidate`, `withCandidate`,
`removeCandidate`, `toggleCandidate`, `countCandidates`, `singleCandidate`,
`computeCandidates`.

## Validation

`canPlace(grid, cell, digit)`, `conflictsAt(grid, cell)`, `findConflicts(grid)`,
`isComplete`, `isLegal`, `isSolved`. `findConflicts` returns every cell involved
in a clash, in reading order — that is what drives the board's error state.

## Solver

`analyse(grid)` solves the way a person would: it applies the cheapest technique
that makes progress, repeats, and stops when nothing applies. It never guesses.

```ts
interface SolveReport {
  solved: boolean;              // did technique alone finish it
  grid: Grid;                   // as far as it got
  steps: readonly Step[];       // every step, in order
  ceiling: number;              // rank of the hardest technique required
  hardestTechnique: Technique | null;
  counts: Record<Technique, number>;
}
```

`solved: false` means the grid needs more than the ladder below — not that it is
unsolvable. For ground truth use `hasUniqueSolution` / `countSolutions`, which
backtrack.

### Technique ladder

Applied strictly in this order, cheapest first:

| Rank | Technique |
| --- | --- |
| 1 | Naked single |
| 2 | Hidden single |
| 3 | Naked pair |
| 4 | Hidden pair |
| 5 | Naked triple |
| 6 | Pointing pair (box → line) |
| 7 | Box-line reduction (line → box) |
| 8 | X-wing |
| 9 | Chain (simple colouring) |

The order is load-bearing. Because the solver always reaches for the cheapest
technique first, the hardest technique a puzzle forces is a stable property of
that puzzle — the rater reads it, the generator bounds digging by it, and hints
rank cells by it. **Reordering `TECHNIQUE_ORDER` re-rates every puzzle in the
bank.**

Cell iteration is fixed and no technique uses randomness, so `analyse` is
deterministic: the same grid always yields the same steps and the same ceiling.

`easiestCell(grid)` returns the first cell the solver places, which — cheapest
technique first — is the one needing the least work. It falls back to the most
constrained empty cell when deduction cannot place anything, so a hint always
has somewhere to go even on a grid the player has painted into a corner.

## Uniqueness

`countSolutions(grid, cap = 2)` backtracks over a live candidate table, most
constrained cell first, stopping at `cap`. `hasUniqueSolution(grid)` is
`countSolutions(grid, 2) === 1`. `solveByBacktracking(grid)` returns the first
solution or `null`.

The cap matters: an empty board has about 6.7e21 solutions, and we only ever
need to know whether the count is 0, 1 or "more than 1".

## Difficulty

Rated on two axes; the harder answer wins.

| Band | Target givens | Given-count range | Technique ceiling |
| --- | --- | --- | --- |
| Easy | 38 | 37+ | Hidden single (2) |
| Medium | 34 | 33–36 | Naked triple (5) |
| Hard | 30 | 27–32 | Box-line (7) |
| Expert | 24 | ≤ 26 | Chain (9) |

**Given count is the primary axis** and the technique ceiling can only raise the
band, never lower it. That ordering is not arbitrary — it is what the measured
data supports. Digging to the design given counts leaves a *singles-only* grid
most of the time, even at 24 givens (24 of 30 sampled Expert-count grids had a
ceiling of 2). Hardest-technique-required and given count are close to
independent in this range, so a ceiling cannot define a band from below; it can
only bound one from above.

So a 24-given grid is Expert even if it falls to singles, and a grid needing an
X-wing is Expert however generous its givens. A grid deduction cannot finish at
all is Expert — the player would be guessing.

`rate(grid)` is deterministic. `bandForGivens`, `bandForCeiling` and
`hardestBand` are exposed for callers that want one axis on its own.

## Generator

`generatePuzzle(difficulty, seed)` returns `{ givens, solution, difficulty,
givenCount, ceiling, seed }`. Same seed, same puzzle — which is what lets the
daily be minted identically anywhere and lets a failing fuzz case be replayed.

Two guarantees, both by construction:

- **Exactly one solution.** Digging starts from a complete solution and clears a
  cell only if the grid still has exactly one solution afterwards, so there is
  no point at which a second solution can appear. Re-checked before returning.
- **Never requires a guess.** A removal is only accepted if the human solver can
  still finish the grid, within the band's technique ceiling.

Digging stops the moment it reaches the target given count, so a puzzle is never
sparser than the design asks — only occasionally denser, by at most
`GIVEN_TOLERANCE`, when no further cell can be cleared. Dig order is shuffled
per seed and retried up to `MAX_ATTEMPTS` times.

There is **no 180-degree symmetry**. Symmetric digging removes cells in pairs
from a full grid and can only ever leave an odd given count; the design targets
are all even.

## Play rules

### Notes

`emptyNotes`, `notesAt`, `setNotesAt`, `clearNotesAt`, `toggleNote`, and
`clearPeerNotes(notes, cell, digit)` — which clears the placed cell entirely and
strikes `digit` from every peer, touching nothing else.

### Mistakes

`MAX_MISTAKES` is 3. In cell-first play every wrong digit costs a life.

**Digit-first containment:** while one digit stays loaded, repeated wrong
placements of *that* digit cost a single life, until the player changes digit or
corrects the error. Without it three fast taps end a puzzle — a cliff that
exists only because the mode is fast. Distinct digits still cost distinct lives.

```ts
let t = loadDigit(createMistakeTracker(), 5);
t = recordWrongPlacement(t, { mode: 'digitFirst', digit: 5 }); // 1 mistake
t = recordWrongPlacement(t, { mode: 'digitFirst', digit: 5 }); // still 1
t = releaseContainment(t);                                     // error corrected
t = recordWrongPlacement(t, { mode: 'digitFirst', digit: 5 }); // 2 mistakes
```

### Hints

`MAX_HINTS` is 3. `chooseHint(grid, solution, selected)` fills the selected cell
if one is selected and still empty, otherwise the easiest unfilled cell.
`hintNeedsConfirmation(state)` is true only for the first hint of a puzzle: it is
irreversible and forfeits the percentile, so the cost is stated before it is
paid. Hints two and three go straight through.

### Session

`createSession(options)` and `apply(state, action)` — a pure reducer holding the
grid, notes, tally, hints, mode and undo history.

Actions: `selectCell`, `loadDigit`, `setMode`, `toggleNotesMode`, `placeDigit`,
`toggleNote`, `erase`, `hint`, `undo`, `redo`.

Two rules the reducer exists to enforce:

- **Undo and redo never change the mistake count.** History holds the grid and
  notes only; the tally does not travel with it. A counted mistake stays counted
  and a locked board stays locked.
- **Undo never restores a spent hint.** Rather than sitting on the undo stack, a
  revealed digit is written into every stored snapshot as well as the live grid,
  so undo can walk back through the player's own entries without lifting a hint.

Givens are inert. `erase` clears the entry if there is one, otherwise the notes,
and ends digit-first containment. With `checking: false` (the purist toggle)
nothing is flagged and nothing is tallied.

## Tests

```bash
pnpm --filter @nonet/engine test
```

Every technique has hand-built fixtures. Alongside those, a seeded fuzz suite
asserts the invariants over generated batches: exactly one solution, never
requires a guess, ratings land in band and are stable across runs, regeneration
from a seed is byte-identical, and peer-note clearing never removes a note it
should not. Failures name the seed, so any case can be replayed.
