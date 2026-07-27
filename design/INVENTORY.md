# Screen & state inventory

Extracted from the prototype's state switcher. Labels are the exact DOM text — see `README.md` for the selector snippet.

Every combination below is designed at **1440 · 834 · 390** and in **light · dark**. Viewport and theme are switched from the same bar.

## Global switches

| Control | Values |
|---|---|
| Viewport | `1440` `834` `390` |
| Theme | `Light` / `Dark` |
| Long values | 99:59+ times, 365 streaks, 1,247 editions, four-digit numbers |
| Menu open | The mobile drawer (390 only) |
| Offline | The offline banner |
| Guest / Signed in | Account state |

## Routes

| Route | States |
|---|---|
| **Home** | `Ready` · `In progress` · `Solved` · `Failed` · `First visit` · `Practice resume` · `Practice abandon` |
| **Board** | `Playing` · `Notes on` · `Digit first` · `Note long-press` · `Pad spent` · `Error cell` · `Digit-first error` · `Hint confirm` · `Paused` · `Failed` · `Practice` · `No hints left` · `Resumed notice` · `First-run offer` |
| **Solved** | `Standard` · `Assisted` · `Second attempt` · `Unchecked` · `Copied` |
| **Archive** | — (month navigation and filters are live in-page) |
| **Record** | `Signed in` · `Guest` · `No history` |
| **Auth** | `Sign in` · `Check email` · `Merged · run held here` · `Merged · account ahead` |
| **Settings** | `Guest` · `Signed in` |
| **How to play** | — |
| **About** | — |

Practice has **no route** — the picker, resume band and abandon confirm are sections of Home. See `docs/DECISIONS.md` NONET-2.

## Reference screens (development only — not part of the product)

| Screen | Purpose |
|---|---|
| **Tokens** | The full token scale: colour (both themes, with contrast ratios), type ramp with role names, space scale, motion durations and easings. **Transcribe this into `packages/design`.** |
| **Focus** | Focus-state visuals for grid cell, pad key, toolbar chip, nav link and primary button, in both themes, plus the board's documented tab order. |
| **Load error** | Puzzle failed to load, with retry. |
| **404** | Not found. |

## Breakpoints

| Range | Header | Board |
|---|---|---|
| < 768px | Drawer (full-screen overlay) | Grid maximised, controls in a bottom band |
| 768–1099px | Single row, inline nav | Grid maximised, controls in a bottom band |
| ≥ 1100px | Single row, inline nav | Grid dominant with a right-hand rail |
