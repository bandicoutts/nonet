# Components

Every value is a token reference. Anything given as a literal is called out as a defect.
State precedence inside a grid cell, lowest first: unit-highlight → match-highlight → selected → error.

### Cell
States: default · selected · focused · focused+selected · unit-highlight · match-highlight · given · user-entry · note · error · hint-placed · veiled

| State | Background | Text | Weight | Border / rules | Non-colour cue |
|---|---|---|---|---|---|
| default | `--surface` | — | — | `cell-thin` on inner edges, `cell-box` on every third edge and the frame | — |
| given | `--surface` | `--fg` | semibold (600) | as default | weight is the cue |
| user-entry | `--surface` | `--accent` | regular (400) | as default | lighter weight |
| note | `--surface` | `--fg3` | regular | as default | `cell-note` role, 3 × 3 fixed grid, 0.06em tracking |
| unit-highlight | `--cell-hl` | inherits | inherits | as default | — |
| match-highlight | `--cell-same` | inherits | inherits | as default | — |
| selected | `--cell-sel` | inherits | inherits | `selected-ring` | — |
| error | `--error-soft` | `--error` | inherits | as default | `error-underline` |
| focused | `--surface` | `--fg` | — | `focus-ring-cell` | ring is ink, selection is cobalt |
| focused+selected | `--cell-sel` | `--accent` | regular | `selected-ring` then `focus-ring-cell` outside it (2 / 4 / 6px inset stack) | two rings, never one colour |
| hint-placed | `--cell-sel` | `--accent` | regular | `selected-ring` | `motion-place` — **not wired** |
| veiled | grid unchanged; `--veil` overlay above it | — | — | overlay border `rule`, or `2px --error` when locked | overlay copy replaces the grid |

Notes:
- Digit and note sizes are **computed, not tokenised**: `round(size × 0.47)` and `max(9, round(size × 0.185))` over `floor(size / 3.6)`. A rebuild should use the `cell-digit` / `cell-note` per-viewport values in `tokens.json`.
- Rules are drawn as `box-shadow: inset`, not borders, so cells butt edge to edge and the frame is a real 2px.
- `hint-placed` never renders: `state.hintCell` is written and never read, and the `nonetPop` keyframe is declared and never referenced.
- Cells carry no `tabIndex`. Grid focus exists only as a specimen on the Focus screen. **Defect.**
- Note text (`--fg3`) on `--cell-sel` measures 3.61:1 light / 3.72:1 dark, and on `--cell-same` 3.98:1 / 4.48:1 — below AA.

### Number pad key
States: default · loaded · errored · held · held+armed · spent · focused

| State | Background | Text | Weight | Border | Non-colour cue |
|---|---|---|---|---|---|
| default | `--surface` | `--fg`, count `--fg3` | semibold digit | `hairline-soft` | — |
| loaded (digit-first) | `--accent` | `--accent-ink`, count `--accent-ink` | semibold | `1px solid var(--accent)` | — |
| errored | `--error-soft` | `--error`, count `--error` | semibold | `1px solid var(--error)` | `error-underline` on the digit |
| held (unarmed) | `--surface`, or `--accent` if also loaded | `--fg2` | regular, digit at 74% of size | `dashed-accent` | count replaced by the word NOTE |
| held+armed | `--cell-same` | `--accent` | regular, 74% | `1px solid var(--accent)` | dash becomes solid; NOTE persists |
| spent | `hatch.spent-key` | `--fg3`, count `--fg3` | drops 600 → 400 | `hairline-soft` | 45° hatch **and** `spent-strike` on both digit and count; pointer handlers null, cursor default |
| focused | as underlying state | — | — | `focus-ring` | — |

Notes:
- Hold threshold 340ms. Arming is a visible step, not silent.
- Transition is `background .12s, border-color .12s` — 120ms is **not a motion token**. Should be `motion-hover`.
- Key height, digit size and internal gap are per-viewport (see layout.md), not tokens.

### Toolbar chip (Notes · Undo · Redo · Erase · Hint · Pause)
States: default · active · disabled · focused

| State | Background | Text | Border |
|---|---|---|---|
| default | transparent | `--fg2` | `hairline` |
| active | `--accent` | `--accent-ink` | `1px solid var(--accent)` |
| disabled | transparent | `--fg3` | `dashed-line`, `opacity .62`, cursor default |
| focused | as above | — | `focus-ring` |

Notes: type is the `control` role. No hover state is defined — the only state change is active. Disabled applies to Hint at 0 remaining; the dashed border is the non-colour cue. `opacity: .62` is a literal, not a token. **Defect.**

### Filled button
Background `--fg`, text `--bg`, no border, type `button` role uppercase. Hover: background `--accent`, text `--accent-ink`, `motion-hover`. Focus: `focus-ring` at offset 3. Padding is inconsistent across screens — `20/30`, `19/28`, `min-height 48 + 0/28`, `min-height 52`, `min-height 48 + 0/22` (dialog). **Not tokenised.** Trailing glyphs are text: `→` at 15px on Home, `↗` at 14px on Share.

### Outline button
Transparent, text inherits `--fg`, border `1px solid var(--fg)`, type `button` role. Hover: background `--hover`. Focus: `focus-ring`. Same padding inconsistency as filled. Secondary sign-out variants drop to `min-height 40` — below the 44 minimum.

### Nav link
Type `control` role at 11 / .14em (834: 10 / .08em), `padding-bottom 4`. Inactive `--fg3`. Active `--fg` plus `underline-active`. Focus `focus-ring` at offset 3. **No hover state.** Today stays active while the route is `board`.

### Settings row
Layout: flex, space-between, `padding 20/4`, `hairline-soft` bottom, `min-height 44`, gap 24. Label `600 15/1.4 Archivo`. Description `400 13/1.6` in `--fg3`, max-width 420. Control is a chip pair or a single chip. At 390 only the Input row stacks to a column (`gap 14`); every other row stays horizontal — **inconsistent**, all rows were meant to stack. Type sizes here are literals, not roles.

### Filter chip / input-mode control / theme chip / year chip
One shared style (`chipSty`), type `chip` role.

| State | Background | Text | Border |
|---|---|---|---|
| inactive | transparent | `--fg3` | `hairline` |
| active | `--accent` | `--accent-ink` | `1px solid var(--accent)` |
| focused | as above | — | `focus-ring` |

Height 44 at 390, 34 above (settings chips 38, drawer theme chips 48). No hover state. The record year chip is the exception: no border, `underline-active` when selected, `min-height 28` — **below the touch minimum and off-pattern**. The record window tab is a second exception: active is `--fg` / `--bg` inverse, inactive is `--fg3` + `hairline`, `min-height 40`.

### Calendar day (Archive)
States: solved · failed · unplayed · today · future · pre-epoch · filtered-out · hover · disabled

| State | Background | Text | Border | Cue |
|---|---|---|---|---|
| solved | `--fg` | `--bg` | `1px solid var(--fg)` | solid fill |
| failed | `--error` | `--accent-ink` | `1px solid var(--error)` | solid fill |
| unplayed | transparent | `--fg3` | `hairline` | outline only |
| today | transparent | `--accent` | `2px solid var(--accent)` | double-weight ring |
| future / pre-epoch | transparent | `--deco` | `dashed-soft` | dashed |
| filtered-out | as its status | as its status | `dashed-soft` | `opacity .3`, not clickable |
| hover (live + matching) | unchanged | unchanged | `selected-ring` | `motion-hover` on box-shadow and opacity |

Contents: day number `400 12/1 mono` tabular, difficulty letter `500 11/1 mono` at `.14em` with `opacity .8`, edition number `400 10/1 mono` at `opacity .62`. Opacity literals `.3`, `.8`, `.62` are **not tokens**. Failed days use `--accent-ink` as their text colour, which reads as a colour-role mismatch — it happens to be the right value in both themes.

### Heat cell (Record)
Same `dayFill` state table as calendar day, no text, no hover, not interactive. Size and gap per layout.md — note the cell/track disagreement recorded there.

### Stat block
Mono label (`mono-label` role, `--fg3`, tracking .18em; .12em at 390 and 834 on Record) over a number. Number role: `stat-number` on Home and Solved, `streak-number` on Record. Label → number gap 12 or 14. On Solved the blocks sit in a grid bounded top and bottom by `hairline`, with `1px solid var(--line)` between columns and `hairline-soft` above wrapped rows; padding `24/28/28`, or `24/0/28` at 390. Column count: role count on desktop, 2 when there are 4 on tablet, 1 at 390.

### Drawer row
Primary: `min-height 64`, `hairline-soft` bottom, label `600 30/1 Archivo` at `-.035em`, `padding-bottom 5`, active adds `underline-active`. Secondary: `min-height 48`, `hairline-soft` bottom, label `500 15/1.3`, `--fg` active / `--fg2` inactive. Both are `tabIndex="0"` and part of the trap. Section headers are `mono-label` at .18em over a `hairline` top rule. Drawer sits at `z-index 60`, background `--bg`, covers the frame. 30px and 15px labels are literals, not roles.

### Confirmation dialog
Scrim `--veil` at `opacity .93` (literal). Panel: `--bg`, `1px solid var(--rule)`, `padding 28`, `max-width 440`, `shadow.elevation`. `z-index 35` (practice) / `36` (hint). Kicker `mono-label` at .2em, `--fg3`. Body `400 15/1.6` `--fg2`. Actions: filled + outline at `min-height 48`, `padding 0/22`, `font 600 11px`, gap 10, wrapping. Focus lands on the first action; Tab is trapped; Esc is the second action; focus returns to the opener. The shadow is a raw `rgba(0,0,0,.14)` and does not re-tone in dark. **Defect.**

### Banner / notice
Inline notice (resumed, first-run): background `--surface`, `hairline-soft`, `padding 12/18` (390: `10/14` with a 12 margin), body `400 12/1.5` `--fg2`, Dismiss as `mono-label` at .16em in `--fg3` with `padding 6` — **~22px tall, below the touch minimum**.
Offline banner: background `--fg`, text `--bg`, `padding 10/20`, `500 11/1.4` mono at .16em uppercase, centred, full frame width, no dismiss.
Practice-resume strip (Home): background `--surface`, `hairline-soft`, `padding 18/20`, action in `--accent` hovering to `--fg`.
Copied toast: `position fixed`, background `--fg`, text `--bg`, `padding 14/22`, `500 11/1 mono` at .18em, `z-index 40`, `motion-toast` (1800ms dwell) — the dwell is a `setTimeout`, the fade is not implemented.

### Cross-component defects worth knowing
1. Links are styled by a raw `a { color: #2C41C4 }` / `a:hover { color: #16181B }` pair in `<helmet>`. Both are light-theme hexes, so links do not re-colour in dark mode. Should be `--accent` / `--fg`.
2. `--cell-hl` and `--hover` are the same value in dark (`#22262A`). Unit shading and row hover are indistinguishable there.
3. Focus rings exist on the Focus specimen screen only. No live control other than the drawer sets `tabIndex`, so the documented tab order is aspirational.
4. `--fg3` on `--bg` measures 4.34:1 in light — below AA, and it carries every mono kicker, caption and metadata string.
5. Chips, buttons, settings rows and drawer rows all use literal type values rather than the published roles; only the Tokens screen renders the roles themselves.
