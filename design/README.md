# Design reference

The Claude Design full-surface prototype, exported verbatim. This is the **pixel and behaviour reference** for the build — not code to port.

```
design/
  export/tokens.json        every token: colour (both themes + measured contrast),
                            type, space, motion, border, shadow — start here
  export/layout.md          measurements per breakpoint, and touch-target audit
  export/components.md      every component and state, as token references
  export/copy.md            the copy deck — every string, keyed by screen and state
  INVENTORY.md              every route and state, and how to reach it
  prototype/Nonet.dc.html   the prototype (single file: markup + logic + mock data)
  prototype/support.js      the runtime it needs
```

**Build from `export/`, not from the prototype.** The four export files are specs written against the prototype and are enough to rebuild the product. The prototype itself is for looking at, and for grepping when a spec is ambiguous — it is 184KB and should not be read front to back.

## Running it

The prototype needs to be served over HTTP — it will not work from `file://`, and it pulls React and Babel from unpkg at runtime, so it needs network.

```bash
cd design/prototype && python3 -m http.server 8899
```

Then open `http://localhost:8899/Nonet.dc.html`.

It takes a second or two to hydrate. If you see raw `{{ placeholders }}`, the runtime has not finished — wait, or check the console. **Headless capture does not work** — the runtime does not hydrate under headless Chrome, so drive it in a real browser.

## Driving it

Every route and state is reachable from the dark state-switcher bar pinned to the top. Clicking is the intended way in.

If you are automating a browser, the switcher controls are `<span>` elements with no roles or IDs, so select them by exact text:

```js
const go = (label) => [...document.querySelectorAll('span')]
  .find(e => e.children.length === 0 && e.textContent.trim() === label)?.click();

go('Board'); go('Digit first'); go('390'); go('Dark');
```

Labels are in sentence case in the DOM (`'Digit first'`), even though CSS renders them uppercase. See `INVENTORY.md` for the full list.

## What is authoritative, and what is not

**Authoritative:**
- Layout, composition, spacing and type at all three viewports
- Colour, in both themes — light and dark are designed siblings, not inversions
- Copy — every string is final, and the voice rules in `docs/DESIGN.md` are strict
- Interaction behaviour — the board logic is real and playable, and encodes the rules in `docs/GAME-RULES.md`
- The **Tokens** screen — the transcription source for `packages/design`
- The **Focus** screen — the focus-state visuals and the board's tab order

**Not authoritative — do not copy:**
- **The markup.** Every control is a `<span onClick>`. There are no buttons, no roles, no `aria-*`, no labels. The accessibility tree comes back empty. Real semantics are yours to write — see `docs/DESIGN.md`.
- **The CSS.** Styles are inlined per element, hundreds of times over. Build from `tokens.css` and the Tokens screen instead.
- **The mock data.** It lives in the `DB` object near the top of the script block. Figures are illustrative.
- **The state switcher.** A development affordance. It is not part of the product.

## Known defects — fix during the build, do not reproduce

The export files audited the prototype against its own token sheet and found real problems. Each is recorded in place; these are the ones that matter most.

**Accessibility**
- ~~`--fg3` on `--bg` measures **4.34:1 in light — below AA**~~ **RESOLVED — see DECISIONS.md NONET-5.** It was nine failures across both themes, not one, because `--fg3` was doing four jobs at once. `--fg3` (light `#6C7278`, dark `#8B9298`) is now scoped to **disabled and spent states only**, which WCAG exempts. Everything else — captions, mono kickers, metadata, inactive states and **note text** — uses the new **`--fg3-text`: light `#5A5F65`, dark `#A0A6AA`**. Worst pairing is note text on `--cell-sel` at 4.79:1 light / 4.77:1 dark. The ratios in `export/tokens.json` → `color.contrast._belowAA` are still those of the *exported prototype* and are left as measured; build to the values here.
- Six interactive elements are **under 44px at 390** despite the token sheet claiming the minimum is never breached: grid cell 39, record window tab 40, settings sign-out 40, record year chip 28, footer link 24, banner dismiss ~22. See `export/layout.md`.
- Focus rings exist only as specimens on the Focus screen. No live control sets `tabIndex` except the drawer, so the documented tab order is aspirational.

**Theming**
- Links are styled by a raw `a { color: #2C41C4 }` pair in `<helmet>` using light-theme hexes, so **links do not re-colour in dark mode**. Use `--accent` / `--fg`.
- ~~`--cell-hl` and `--hover` are the same value in dark~~ **RESOLVED — NONET-7.** Dark `--hover` is now `#24292D`; `--cell-hl` unchanged.
- ~~The dialog shadow is a raw `rgba(0,0,0,.14)` and does not re-tone in dark.~~ **RESOLVED — NONET-7.** `SHADOWS` is themed; dark takes alpha 0.55. Note that in dark the dialog is separated by its `--rule` border rather than the shadow, so do not drop the border.

**Behaviour**
- `motion-place` is published and the `nonetPop` keyframe exists, but nothing references it — **placed digits and hints do not animate**. `state.hintCell` is written and never read.
- The Copied toast dwell is a `setTimeout`; the fade is not implemented.
- The share text does not pluralise: a 2-mistake solve reads "2 mistake".
- `headerKicker` is computed for every route and never rendered.

**Token hygiene**
- The heat-strip cell boxes and grid tracks disagree at 1440 and 834. Build to the Tokens screen values.
- Chips, buttons, settings rows and drawer rows use literal type values rather than the published roles. `opacity` literals (`.3`, `.62`, `.8`, `.93`) and a 120ms transition are off-token.

## Before you build

Read `docs/GAME-RULES.md` and the `NONET-2` entry in `docs/DECISIONS.md`. Several rules are invisible in the prototype's appearance but are load-bearing — in particular the digit-first mistake containment rule and the sign-in merge precedence, both of which need tests.
