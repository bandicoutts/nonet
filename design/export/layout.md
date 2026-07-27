# Layout

Every figure measured from `Nonet.dc.html` as it renders. Viewports 1440 / 834 / 390.

## Breakpoints

| Class | Range | Test in prototype |
|---|---|---|
| desktop | ≥ 1100 | `!m && !t` |
| tablet | 431 – 1099 | `vw > 430 && vw < 1100` |
| mobile | ≤ 430 | `vw <= 430` |

### What changes at each boundary

| Boundary | Change |
|---|---|
| ≥ 1100 | Board gains the 320 rail to the right of the grid. Hero splits `1fr / 500px`. Archive splits `minmax(0,900px) / minmax(250px,1fr)` and the filter rail appears. Settings splits `1fr / 720px`. Focus splits `1fr / 340px`. Record difficulty tables split `1fr / 1fr`. Type samples capped at 132px. |
| < 1100 | Rail becomes a full-width band below the grid: toolbar 6 columns, pad 9 columns. All two-column compositions collapse to one. Plate max-width 470. Record stat grid stays 4 columns. Type samples capped at 84px. |
| ≤ 430 | Site header collapses to wordmark + MENU; a full-frame drawer carries nav, theme and account. Board gets a sticky bottom bar: toolbar 5 columns, pad 5 columns × 2 rows (9 keys + ERASE). Archive calendar becomes a non-interactive 7 × 30px month summary and the row list becomes the only entry point; filters move above the calendar as a stacked block. Token, contrast, type, layout and motion tables drop their headers and reflow to one column. Record heat strip scrolls horizontally; record stat grid 2 columns; solved stat grid 1 column. Type samples capped at 42px. |

## Frame and page

| | 1440 | 834 | 390 |
|---|---|---|---|
| Frame width | 1440 | 834 | 390 |
| Frame min-height (board) | 900 | 1040 | 720 |
| Frame min-height (all other routes) | 1080 | 1000 | 780 |
| Desk padding around frame | 26 / 0 / 60 | 26 / 0 / 60 | 26 / 0 / 60 |
| Page gutter (`L.pad`) | 88 | 40 | 20 |
| Header top padding (`L.navPad`) | 34 | 34 | 20 |
| Hero top padding | 68 | 54 | 40 |
| Section gap (space above a new section rule) | 62 | 62 | 46 |
| Column gap in two-column compositions | 72 | 44 | 34 |

Header and footer have no fixed height.

| | 1440 | 834 | 390 |
|---|---|---|---|
| Header content height | 34 (control row) | 34 | 44 (menu trigger) |
| Header horizontal gap | 20 | 22 | 10 |
| Nav item gap | 26 | 14 | — (drawer) |
| Footer top gap | 62 | 62 | 46 |
| Footer inner rule → content | 20 | 20 | 20 |
| Footer bottom padding | 40 | 40 | 40 |
| Offline banner | 10 / 20 padding | 10 / 20 | 10 / 20 |

## Board

| | 1440 | 834 | 390 |
|---|---|---|---|
| Grid cell | 80 | 76 | 39 |
| Grid width (9 cells) | 720 | 684 | 351 |
| Grid frame | 2px `--rule` | 2px | 2px |
| Cell divisions | 1px inset, 2px on every third edge | same | same |
| Title bar above grid | width = grid, 12 padding-bottom, 1px rule | same | 12 / 18 / 10 padding, no rule |
| Title bar → grid | 18 | 18 | 0 |
| Grid area padding | 16 / 40 / 16 / 0 | 20 / 40 | 0 / 18 |
| Rail width | 320 | — | — |
| Rail border | 1px `--line` left | — | — |
| Rail padding | 16 / 0 / 16 / 36 | — | — |
| Rail block gap | 14 | — | — |
| Band (below grid) | — | 1px rule top, 16 / 40 / 24 | 1px rule top, 12 / 16 / 18, sticky |
| Toolbar control height | 46 | 46 | 50 |
| Toolbar control padding | 0 / 14 | 0 / 14 | 0 / 4 |
| Toolbar layout | 1 column, gap 6 (Undo/Redo nested 1fr 1fr, gap 6) | 6 columns, gap 8 | 5 columns, gap 6 |
| Pad key min-height | 60 | 66 | 58 |
| Pad key digit size | 26 | 26 | 24 |
| Pad key digit → count gap | 4 | 6 | 3 |
| Pad layout | 3 columns, gap 8 | 9 columns, gap 8 | 5 columns, gap 6, two rows |
| Input-mode chip | 34 min-height, 0 / 12 padding, gap 6 | 34, gap 5 | 44, gap 5 |
| Timer size | 44 | 30 | 22 |
| Mistake dot | 9 × 9, gap 5 | 9 × 9, gap 5 | 9 × 9, gap 4 |
| Notice / banner | 12 / 18 padding | 12 / 18 | 10 / 14, 12 margin |
| Veil inset | -2 on all sides | -2 | left/right 18, top/bottom 0 |

Gap structure, desktop rail, top to bottom: timer → 14 → mistake block → 14 → input pair (internal 6, caption 8) → 14 → pad grid (gap 8) → 14 → toolbar stack (gap 6) → 14 → keyboard legend (14 padding-top over a 1px rule, gap 6) → auto → status block (12 padding-top over a 1px `--line2` rule).

## Archive calendar

| | 1440 | 834 | 390 |
|---|---|---|---|
| Day cell | 1fr × 86 min-height | 1fr × 66 | fixed 30 track, aspect-ratio 1 |
| Cell padding | 9 | 9 | 0 |
| Column template | `repeat(7,1fr)` | `repeat(7,1fr)` | `repeat(7,30px)` |
| Gap | 8 | 8 | 6 |
| Weekday head → grid | 10 | 10 | 10 |
| Month label size | 38 | 32 | 26 |
| Month nav button | 44 × 44 | 44 × 44 | 44 × 44 |
| Interactive | yes | yes | no — summary only |
| List row min-height | 46 | 46 | 56 |
| List row columns | `1fr 96 104 104 84`, gap 16 | same | `1fr auto`, gap 6 / 12 |
| List row padding | 14 / 4 | 14 / 4 | 12 / 4 |

## Record heat strip

| | 1440 | 834 | 390 |
|---|---|---|---|
| Cell (Tokens screen — authority) | 19 | 11 | 9 |
| Gap (Tokens screen — authority) | 4 | 3 | 2 |
| Cell as rendered by `yearStrip()` | 10 | 9 | 9 |
| Gap as rendered | 3 | 2 | 2 |
| Rows | 7 | 7 | 7 |
| Month label row | 12 high, 8 margin-bottom | same | same |
| Overflow | none | none | horizontal scroll, 8 padding-bottom |

**Defect.** The grid tracks are sized from `L.stripCell` / `L.stripGap` (19/4, 11/3, 9/2) while each cell box is sized from local `c` / `g` (10/3, 9/2, 9/2). At 1440 and 834 the squares do not fill their tracks. Build to the Tokens screen values and drop the second pair.

The Home sparkline is a separate 30-cell run at 9 × 9 with gap 3 at every viewport.

## Minimum touch target at 390

Tokens screen states `tap-target-min: 44 — never below this on any viewport`. Measured:

| Element | Height | Meets 44 |
|---|---|---|
| Number pad key | 58 | yes |
| Erase key (pad row) | 58 | yes |
| Toolbar control (Notes, Undo, Redo, Hint, Pause) | 50 | yes |
| Auth input / submit | 52 | yes |
| Display-name input, Save, drawer theme chip, dialog action, primary button | 48 | yes |
| Drawer primary nav row | 64 | yes |
| Drawer secondary nav row | 48 | yes |
| Archive list row | 56 | yes |
| Hero primary button | 53 (20 padding + 13 line) | yes |
| Menu trigger, drawer Close | 44 | yes |
| Back control | 44 | yes |
| Input-mode / filter / theme chip | 44 | yes |
| Month nav, jump select | 44 | yes |
| Practice difficulty row | 44 | yes |
| Settings row | 44 | yes |
| Clear all | 44 | yes |
| **Grid cell** | **39** | **no** |
| **Record window tab (All time / Last 30 days)** | **40** | **no** |
| **Settings Sign out / Sign in** | **40** | **no** |
| **Record year chip** | **28** | **no** |
| **Footer link** | **24** | **no** |
| **Banner Dismiss** | **~22** (10px text + 6 padding) | **no** |
| Archive calendar cell | 30 | n/a — not interactive at 390 |
| Header theme toggle, auth chip | 34 | n/a — desktop and tablet only |
