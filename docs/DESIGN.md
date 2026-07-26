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

## Voice
Precise, calm, editorial; dry wit in small doses. No exclamation marks, no emoji, sentence case except mono kickers. Celebration is dignified ("Solved in 7:12"), never confetti.

## Accessibility (requirement, not mode)
Complete keyboard-only play; ARIA grid semantics; WCAG AA everywhere (including cobalt-as-text); focus states distinct from selection; prefers-reduced-motion honored.
