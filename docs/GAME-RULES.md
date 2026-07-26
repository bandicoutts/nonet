# Game rules & mechanics

Product rules locked 2026-07-26 (see DECISIONS.md #1). The design brief (DESIGN-BRIEF.md) is the canonical screen-by-screen expression of these.

## The daily
- One 9×9 puzzle/day, same grid for everyone, unique solution, published 00:05 UTC.
- Difficulty rhythm: Mon Easy · Tue–Wed Medium · Thu–Fri Hard · Sat Expert · Sun Hard.
- Streak = consecutive **local calendar days** with the daily solved. No freezes, no grace periods; practice and archive never count.
- Finished dailies can be replayed (unscored, labeled "replay"). Archive is free and fully playable; archive solves record stats but never extend streaks.

## Mistakes & checking
- Auto-check ON by default: wrong digit flags immediately (error state until corrected) and counts once toward 3/3. Undo/redo never uncount a mistake.
- 3/3 → board locks (failed state). Retry same puzzle from scratch allowed; solving before local midnight keeps the streak, marked "second attempt", no percentile.
- Purist toggle (Checking: off): nothing flagged, no tally, mistakes indicator hidden; solve marked "unchecked", no percentile.

## Hints
- 3 per puzzle. A hint fills the selected cell (else the easiest unfilled cell) with the correct digit.
- Any hint marks the solve "assisted": streak survives, no percentile. Mirrors Halve's `used_hint`.

## Board interaction
- Select + type; full keyboard play: arrows navigate, 1–9 place/note, Space toggles notes, Backspace erases, Cmd/Ctrl+Z undo, +Shift redo, P pause, H hint.
- Selection highlights row/column/box; cells with digits highlight all matching digits (both are settings, default on). Givens selectable for highlighting, inert to editing.
- Notes: manual only in v1. Placing a digit auto-clears that digit from notes in the same row/column/box. Erase clears entry, else notes.
- Undo unlimited (covers notes/erases), with redo.

## Timer & pause
- Explicit pause veils the grid; tab blur auto-pauses. Timer visibility is a setting (time always recorded). Display caps at 99:59+.

## Practice
- Pre-built bank per difficulty (Easy → Expert; defined by technique ceiling + given count — UI shows only label, givens, median time).
- One in-flight puzzle; starting a new one prompts to abandon. Own stats section; invisible to streaks/percentiles.

## Sharing
Spoiler-free text + link (clipboard + native share sheet): `NONET No. 1247 · Hard` / `7:12 · 1 mistake · top 22%` / URL. Image card is v2.
