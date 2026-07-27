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
  score: number;                // summed weight of every step — the difficulty signal
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

One number: the summed weight of every deduction the solve requires, in naked
singles.

```
score = Σ over solver steps of TECHNIQUE_WEIGHTS[technique]
```

| Rank | Technique | Weight |  | Rank | Technique | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Naked single | 1 |  | 6 | Pointing pair | 12 |
| 2 | Hidden single | 2 |  | 7 | Box-line | 14 |
| 3 | Naked pair | 5 |  | 8 | X-wing | 30 |
| 4 | Hidden pair | 8 |  | 9 | Chain | 50 |
| 5 | Naked triple | 10 |  |  |  |  |

Steps, not eliminations — one naked-pair step that kills six candidates is one
deduction a human had to make, not six. Because the solver is greedy
cheapest-first, the score measures the *easiest available path*, which is what a
competent solver would actually find.

| Band | Score | Target givens | Scanning baseline | Margin over baseline |
| --- | --- | --- | --- | --- |
| Easy | < 47 | 38 | 43 | — |
| Medium | 47–57 | 34 | 47 | — |
| Hard | 58–82 | 30 | 51 | 7 |
| Expert | ≥ 83 | 24 | 57 | 26 |

Given count is **not** consulted. It is already implicit: every placement costs
at least one point and a puzzle needs `81 - givens` of them, so a grid solved
entirely by naked singles scores exactly `81 - givens` — the "scanning baseline"
above. What the score adds on top is technique work, and that is the part a
ceiling could never measure, being a maximum over the solve rather than a total.

The margins are the point. A Hard puzzle must cost at least 7 points more than
scanning a 30-given grid, and an Expert puzzle 26 more — so those labels mean
"this needs technique you can feel" rather than "this has fewer digits showing".

`scoreOf(grid)` returns `Infinity` when deduction cannot finish, so such a grid
rates Expert: the player would be guessing. `rate` and `scoreOf` are
deterministic.

### Recalibrating

Thresholds are valid only for one weight table and one technique ladder. Change
`TECHNIQUE_WEIGHTS`, add a technique or reorder `TECHNIQUE_ORDER` and every
puzzle silently re-rates. So:

```bash
pnpm --filter @nonet/engine calibrate 500
```

It digs 500 puzzles per band with no score filtering, prints the score
distribution and in-band rates, and emits a `SCORE_FLOORS` literal to paste into
`src/difficulty.ts`. Each floor is placed at the percentile of its band's own
distribution that leaves the target share of digs qualifying — 95% for Easy and
Medium, 40% for Hard, 25% for Expert. Lower acceptance buys a more distinctive
band and costs re-rolls.

**The weights themselves are judgement, not measurement.** Calibrating them
properly needs human solve times, which will not exist until the product ships.
The plan is to persist each puzzle's score, then re-derive the weights from real
completion times and re-band the bank with a script — which is why `score`
belongs on the `puzzles` row when Phase 3 lands the schema.

## Generator

`generatePuzzle(difficulty, seed)` returns `{ givens, solution, difficulty,
givenCount, ceiling, score, seed }`. Same seed, same puzzle — which is what lets
the daily be minted identically anywhere and lets a failing fuzz case be
replayed.

Three guarantees, all by construction:

- **Exactly one solution.** Digging starts from a complete solution and clears a
  cell only if the grid still has exactly one solution afterwards, so there is
  no point at which a second solution can appear. Re-checked before returning.
- **Never requires a guess.** A removal is only accepted if the human solver can
  still finish the grid, within the band's technique ceiling.
- **The band is what it says.** The dig is re-rolled until the puzzle's score
  lands inside the band, so an Expert puzzle demands Expert-level work.

Digging stops the moment it reaches the target given count, so a puzzle is never
sparser than the design asks — only occasionally denser, by at most
`GIVEN_TOLERANCE`, when no further cell can be cleared.

Holding the given count exact *and* the band honest means re-rolling. Measured
in-band rates for a single dig are Easy 97%, Medium 95%, Hard 42%, Expert 26% —
so Expert costs about four attempts. `MAX_ATTEMPTS` is 40, putting outright
failure near 4 in 100,000. Generation runs once a day for the daily and once per
bank seed, so the attempts are free in practice.

`digToTarget(difficulty, rng)` is the rung below: one dig, no score filtering.
Calibration needs it, because measuring how raw digs are distributed is the
whole point. Prefer `generatePuzzle` otherwise.

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
from a seed is byte-identical, Hard and Expert scores clear their scanning
baseline, and peer-note clearing never removes a note it should not. Failures
name the seed, so any case can be replayed.

A calibration regression test checks the score floors are still reachable from
each band's given count. If it fails, the weights or the ladder moved and the
thresholds need re-deriving — rerun `calibrate`.
