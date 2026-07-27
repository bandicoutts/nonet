# Design reference

The Claude Design full-surface prototype, exported verbatim. This is the **pixel and behaviour reference** for the build — not code to port.

```
design/
  prototype/Nonet.dc.html   the prototype (single file: markup + logic + mock data)
  prototype/support.js      the runtime it needs
  tokens.css                colour tokens, extracted (both themes)
  INVENTORY.md              every route and state, and how to reach it
```

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

## Before you build

Read `docs/GAME-RULES.md` and the `NONET-2` entry in `docs/DECISIONS.md`. Several rules are invisible in the prototype's appearance but are load-bearing — in particular the digit-first mistake containment rule and the sign-in merge precedence, both of which need tests.
