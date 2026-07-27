# @nonet/design

The single source of truth for styling. Transcribed from the Claude Design
prototype's **Tokens** screen via `design/export/tokens.json`.

Never hardcode a colour, size or spacing in a component — import from here, or
read the CSS custom properties.

```ts
import { stylesheet, palettes, resolveType, contrastRatio } from '@nonet/design';

stylesheet();                       // the whole token sheet as CSS
palettes.dark['--cell-sel'];        // '#2C365C'
resolveType('display', 1440);       // { size: 56, weight: 600, ... }
```

## What is in here

| Module | Holds |
| --- | --- |
| `color` | Both palettes, the text pairings, and the contrast exemptions |
| `contrast` | WCAG 2.1 relative luminance and ratio maths |
| `type` | 18 type roles, responsive, with `resolveType` |
| `space` | The 12-step scale, `nearestSpace`, `TAP_TARGET_MIN` |
| `motion` | Durations, easings, the reduced-motion rule |
| `border` | Border, rule, focus and cell recipes |
| `shadow`, `radius`, `hatch` | Elevation, the square-corner token, the spent-key hatch |
| `viewports` | The three drawing widths, the two layout breakpoints |
| `css` | Emits everything as custom properties |

## The `--fg3` split

The prototype's `--fg3` failed WCAG AA in nine pairings across both themes,
because one token carried four different jobs. Resolved in **DECISIONS.md
NONET-5**:

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--fg3` | `#6C7278` | `#8B9298` | Disabled and spent states **only** — WCAG-exempt |
| `--fg3-text` | `#5A5F65` | `#A0A6AA` | Captions, kickers, metadata, inactive states, **note text** |

`--fg3` keeps the values the design shipped. It stays legitimate because a spent
pad key carries a 45-degree hatch as a non-colour cue, so nothing rests on its
contrast — if that hatch is ever removed, the exemption goes with it.

**This is enforced, not just documented.** `TEXT_PAIRINGS` records where each
text colour is rendered, and the suite walks it in both themes computing the
ratio from the palette. Move a colour and the test fails. Adding a component
that puts a foreground on a new background means adding that pairing.

## Theming

`stylesheet()` emits light on `:root`, dark under
`prefers-color-scheme: dark`, and both `[data-theme]` overrides — so an explicit
choice wins in **both** directions. A player who picked light keeps light on a
device set to dark, which the prototype could not do: its links were a raw
`a { color: #2C41C4 }` that never re-toned.

Type steps up at the **layout** breakpoints, 768 and 1100 (NONET-2), not at the
widths the design was drawn at (390, 834, 1440). Joining the two is an inference
— see `viewportForWidth`.

## What was deliberately not transcribed

- **Off-scale spacing.** The export lists 26 raw values in use (2, 3, 5, 7, 9,
  10, 11, 13, 16, 22, …). They are recorded there as defects. The build snaps to
  the 12-step scale; use `nearestSpace` when porting a measurement.
- **Off-role type.** Several components render sizes and tracking that are not
  roles. Each role's `note` records what the prototype actually did.
- **Raw colours.** Link colours, the body ground, the frame edge and the dev
  switcher are not tokens and are not product.

## Two departures from the export, beyond `--fg3`

Both were recorded as defects in `design/README.md` and are resolved in
**NONET-7**:

1. **Dark `--hover` is `#24292D`**, not `#22262A`. The export shipped it equal
   to `--cell-hl`, so board unit shading and list hover moved as one token.
   Light draws them apart deliberately — hover reads a touch stronger, being
   transient rather than ambient — and dark now does too. `--cell-hl` is
   unchanged.
2. **`SHADOWS` is themed.** Dark takes alpha `0.55` against light's `0.14`.
   A black shadow over the near-black dark scrim darkens by ΔL\* 1.5, which is
   nothing; 0.55 gets it to 5.1, and pure black would only reach 8.1. **In dark
   the dialog is separated by its `--rule` border, not by the shadow** — do not
   drop the border.

Still open: the six sub-44px touch targets in `design/export/layout.md` are a
live AA failure. `TAP_TARGET_MIN` is exported so components can assert against
it.

## Tests

```bash
pnpm --filter @nonet/design test
```
