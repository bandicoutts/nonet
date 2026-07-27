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

## Open token-level defects

Two remain from `design/README.md` and both need a design decision, so they are
transcribed as measured rather than silently re-authored:

1. **The dialog shadow does not re-tone.** `0 24px 60px rgba(0,0,0,.14)` is the
   same black alpha in dark, where it reads as almost nothing against `--bg`.
2. **`--cell-hl` and `--hover` are identical in dark** (`#22262A`), so unit
   shading and row hover are indistinguishable there.

Separately, the six sub-44px touch targets in `design/export/layout.md` are a
live AA failure. `TAP_TARGET_MIN` is exported so components can assert against
it.

## Tests

```bash
pnpm --filter @nonet/design test
```
