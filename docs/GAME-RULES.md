# Game rules & mechanics

Product rules locked 2026-07-26 (see DECISIONS.md #1). The design brief (DESIGN-BRIEF.md) is the canonical screen-by-screen expression of these.

## The daily
- One 9×9 puzzle/day, same grid for everyone, unique solution, published 00:05 UTC.
- Difficulty rhythm: Mon Easy · Tue–Wed Medium · Thu–Fri Hard · Sat Expert · Sun Hard.
- Streak = consecutive **local calendar days** with the daily solved. No freezes, no grace periods; practice and archive never count. "Local" means the **device's timezone at the moment of the solve**, recorded per solve — so a player who flies west can bank two dailies in one apparent day and one who flies east can skip one, but a streak never breaks because of a flight (DECISIONS.md NONET-9).
- Finished dailies can be replayed (unscored, labeled "replay"). Archive is free and fully playable; archive solves record stats but never extend streaks.

## Mistakes & checking
- Auto-check ON by default: wrong digit flags immediately (error state until corrected) and counts once toward 3/3. Undo/redo never uncount a mistake.
- 3/3 → board locks (failed state). Retry same puzzle from scratch allowed; solving before local midnight keeps the streak, marked "second attempt", no percentile.
- Purist toggle (Checking: off): nothing flagged, no tally, mistakes indicator hidden; solve marked "unchecked", no percentile.

## Hints
- 3 per puzzle. A hint fills the selected cell (else the easiest unfilled cell) with the correct digit.
- Any hint marks the solve "assisted": streak survives, no percentile. Mirrors Halve's `used_hint`.
- **The first hint in a puzzle confirms once** (irreversible, forfeits the percentile). Hints 2 and 3 go straight through — the cost has already been accepted. Hints are not undoable.

## Board interaction

### Input modes
Two, chosen in Settings and switchable on the board. Mode is remembered.
- **Cell first** (default) — select a cell, then choose a digit.
- **Digit first** — select a digit once, then tap every cell that takes it; the digit stays loaded until changed or cleared. `ERASE` can be loaded the same way.
- Digit-first highlights existing instances of the loaded digit only. It must **never** highlight legal placements — that is auto-candidate assistance and is v2.

### Repeating a mistake
**One misconception costs one life, in both modes — but the two modes contain it differently, because the gesture differs.** Distinct errors always cost distinct lives, and three of them still lock the board.

- **Digit-first:** while a digit remains loaded, repeated wrong placements of it count as one mistake **across every cell tried**, until the player changes digit or corrects the error. The gesture is painting one digit over many cells, so the whole sweep is one intent. Without this, three fast taps end a puzzle — a cliff that exists only because the mode is fast.
- **Cell-first:** repeated wrong placements of the same digit **in the same cell** count as one mistake. The unit of intent here is the cell — select one, commit a digit, move on — so trying 6 in cell A and then 6 in cell B are two decisions and both are charged. What is not charged is pressing 6 into cell A again, which is a player checking the key registered, or holding one belief about one cell.

Containment ends when the error is corrected, when the cell is erased, or (digit-first) when the loaded digit **changes**. Re-tapping the key that is already loaded is a stutter, not a return: it expresses no change of mind and keeps the containment. Loading `ERASE`, or clearing the cursor, does end it — those are a different tool. Switching input mode charges the next slip, because it is a change of gesture.

**Engine rules, both unit-tested.** DECISIONS.md NONET-39.

### Notes
- Manual only in v1. Placing a digit auto-clears that digit from notes in the same row/column/box. Erase clears entry, else notes.
- **Long-press a pad key** writes that digit as a note in the selected cell (takes a pencil mark from four taps to two). The `NOTES` mode toggle remains for players who prefer an explicit mode.

### Other
- Full keyboard play: arrows navigate, 1–9 place, **Shift+1–9 note**, Space toggles notes mode, Backspace/Del erases, Cmd/Ctrl+Z undo, +Shift redo, P pause, H hint.
- Selection highlights row/column/box; cells with digits highlight all matching digits (both are settings, default on). Givens selectable for highlighting, inert to editing.
- Pad keys show per-digit remaining counts and become **non-interactive at zero**, with a non-colour cue as well as reduced contrast.
- **Auto-advance** (setting, default off): after placing, selection moves to the next empty cell in reading order. Cell-first only.
- Undo unlimited (covers notes/erases), with redo. Undo never uncounts a mistake and never restores a hint. The stack is **not** autosaved, so it empties on reload — unlimited means unlimited within a sitting (DECISIONS.md NONET-9).

## Leaving a puzzle
The board is an immersive mode, not a page — no site nav during play. The exit is a left-aligned back control labelled for its origin: `← TODAY` for the daily and for practice, `← ARCHIVE` for an archive edition. Never "close" — the puzzle is autosaved and nothing is discarded.

## Timer & pause
- Explicit pause veils the grid; tab blur auto-pauses. Timer visibility is a setting (time always recorded). Display caps at 99:59+.

## Practice
- Pre-built bank per difficulty (Easy → Expert; defined by the engine's **weighted effort score** — see DECISIONS.md NONET-4. UI shows only label, givens, median time; the score is internal).
- One in-flight puzzle; starting a new one prompts to abandon. Own stats section on Record; invisible to streaks/percentiles.
- **Practice lives on Home, not on its own page** — the picker, the resume band and the abandon confirm are all sections of Home. There is no `/practice` route. See DECISIONS.md NONET-2.
- Practice boards still carry the 3-mistake lock and 3 hints; only the streak and percentile stakes are absent.

## Accounts & sync
- Guest-first: full play, settings and streaks in localStorage.
- Sign-in (magic link) merges: **server wins for completed solves, most recent autosave wins for an in-progress puzzle.**
- The merge is reported, never negotiated — a one-time post-sign-in summary states what merged, which run stands and which in-progress puzzle was kept, then continues. No choices, no conflict dialog.

## Sharing
Spoiler-free text + link (clipboard + native share sheet): `NONET No. 1247 · Hard` / `7:12 · 1 mistake · top 22%` / URL. Image card is v2.
