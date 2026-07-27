# Design language

Locked 2026-07-26 from the Claude Design prototype (home light/dark, board mid-solve, solved). The prototype is the pixel reference; this doc is the contract.

## Personality
Cool & architectural. Swiss/Scandinavian precision: strict grid, hairline rules, generous whitespace, one confident accent. Engineered and inevitable — the visual language of pure logic. Calm, premium, editorial in *quality*; never gamified-casual.

**Deliberately distinct from Halve.** Forbidden: warm paper/cream palettes, amber or teal accents, italic serif display type (all belong to Halve). Also forbidden: generic-AI tells (purple gradients, glassmorphism, emoji in UI, cookie-cutter soft-shadow cards).

## Ingredients
- **Palette:** cool neutrals — bone/off-white ground, graphite ink; cobalt blue as the single accent. Light-first with a true dark sibling theme (deep graphite ground, bone type, cobalt holds) — designed, not inverted.
- **Type:** grotesque sans for display and UI; mono for kickers (UPPERCASE TRACKED), timers, meta. Tabular figures for every number. Oversized display numerals ("No. 1247") are the brand's signature moment.
- **Wordmark:** NONET — bold grotesque caps.
- **Grid conventions (sacred):** givens bold black/ink · user entries cobalt · notes small muted. Non-color redundancy: given-vs-yours is also bold-vs-regular; error cells get a non-color cue (thin underline) plus error red + tint.
- **Board states:** selected cell (cobalt border + tint), row/column/box wash, matching-digit highlight, error, paused veil (opaque plate over cells).
- **Chrome:** hairline rules structure every page; number pad with per-digit remaining counts; mistakes as three squares (■□□).

## Layout & responsive (locked 2026-07-27, DECISIONS.md NONET-2)
- **Breakpoints:** mobile drawer below 768px · single-row site header at 768px+ · board side rail at 1100px+ (bottom control band below it). Tablet portrait is treated as a large phone, not a small desktop.
- **Board at 1100px+:** grid dominant (~740px) left, hairline-separated rail right holding timer, mistakes, input-mode control, number pad, controls and a persistent keyboard legend.
- **Board below 1100px:** grid maximised, controls as a full-width band in thumb reach.
- **Mobile menu:** full-screen overlay in `--bg`, hairline-ruled, not a side sheet — an editorial contents page, not a borrowed app pattern. Trigger is three stacked hairlines (the product's own rule language) plus a mono `MENU` label. Focus-trapped, Esc closes, no page scroll behind.
- **Chrome consistency:** site header + footer on all browsing screens; immersive header on Board and Solved; minimal header on Auth, 404 and load error. Every screen has a way out.
- **Footer** at every viewport: `© Nonet` left; `Settings · About · How to play` right.

## Component rules
- **Toggles — two idioms only.** Filled chip on working surfaces (filled = on, hairline outline = off); settings row in Settings. The label always names the control, never the action: `NOTES`, not `NOTES OFF`. Theme is a three-way `LIGHT / DARK / SYSTEM`.
- **Calendars are two different components.** Record is a non-interactive year heat strip (a month grid cannot show a 61-day run); Archive is a navigable month grid with difficulty per cell and a filter rail. Legends must be worded identically in both.
- **Captions must not look like controls.** No inert text sitting in a row of buttons.
- **Tokens:** colour, type, space and motion are all named on the prototype's Tokens screen, which is the single transcription source for `packages/design`. Prefer changing a component to reuse an existing token over adding a new one.

## Voice
Precise, calm, editorial; dry wit in small doses. No exclamation marks, no emoji, sentence case except mono kickers. Celebration is dignified ("Solved in 7:12"), never confetti.

## Accessibility (requirement, not mode)
Complete keyboard-only play; ARIA grid semantics; WCAG AA everywhere (including cobalt-as-text); focus states distinct from selection; prefers-reduced-motion honored.

**Division of labour:** the prototype designs the *visual* focus layer only — a focus ring distinct from cell selection, specified on the Focus screen for grid cell, pad key, toolbar chip, nav link and primary button, in both themes, plus the board's tab order. **Real semantics (roles, `aria-*`, roving tabindex, focus trapping) are the build's job** — the design runtime renders every control as a `<span onClick>` and cannot express them. Do not assume the reference carries them.
