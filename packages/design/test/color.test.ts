import { describe, expect, test } from 'vitest';
import {
  CONTRAST_EXEMPT,
  COLOR_TOKENS,
  TEXT_PAIRINGS,
  THEMES,
  palettes,
} from '../src/color.js';
import { AA_NORMAL_TEXT, contrastRatio, relativeLuminance } from '../src/contrast.js';

describe('palettes', () => {
  test('both themes are defined', () => {
    expect([...THEMES]).toEqual(['light', 'dark']);
  });

  test('every token exists in both themes', () => {
    for (const theme of THEMES) {
      for (const token of COLOR_TOKENS) {
        expect(palettes[theme][token], `${theme} ${token}`).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  test('no token is missing from either theme — light and dark are siblings', () => {
    expect(Object.keys(palettes.light).sort()).toEqual(Object.keys(palettes.dark).sort());
  });

  test('carries the values transcribed from the design export', () => {
    expect(palettes.light['--bg']).toBe('#F1F2F3');
    expect(palettes.light['--fg']).toBe('#16181B');
    expect(palettes.light['--accent']).toBe('#2C41C4');
    expect(palettes.dark['--bg']).toBe('#131518');
    expect(palettes.dark['--accent']).toBe('#93A6FF');
  });
});

describe('the --fg3 split (DECISIONS.md NONET-5)', () => {
  test('--fg3-text exists in both themes', () => {
    expect(palettes.light['--fg3-text']).toBe('#5A5F65');
    expect(palettes.dark['--fg3-text']).toBe('#A0A6AA');
  });

  test('--fg3 keeps the values the prototype shipped', () => {
    expect(palettes.light['--fg3']).toBe('#6C7278');
    expect(palettes.dark['--fg3']).toBe('#8B9298');
  });

  test('the two are genuinely different tokens', () => {
    for (const theme of THEMES) {
      expect(palettes[theme]['--fg3-text']).not.toBe(palettes[theme]['--fg3']);
    }
  });

  test('--fg3 is never used as a text colour', () => {
    // It is scoped to disabled and spent states, which WCAG 1.4.3 exempts.
    // If it reappears in TEXT_PAIRINGS the AA failure comes back with it.
    expect(TEXT_PAIRINGS.map((pairing) => pairing.foreground)).not.toContain('--fg3');
  });

  test('--fg3 and --deco are recorded as exempt, with a reason', () => {
    const exempt = CONTRAST_EXEMPT.map((entry) => entry.token);
    expect(exempt).toContain('--fg3');
    expect(exempt).toContain('--deco');
    for (const entry of CONTRAST_EXEMPT) {
      expect(entry.reason.length, entry.token).toBeGreaterThan(20);
    }
  });
});

describe('shading tokens stay distinguishable (DECISIONS.md NONET-7)', () => {
  test('unit shading and hover are different values in both themes', () => {
    // They were identical in dark, so two semantically separate tokens moved
    // as one. They never appear together — cell-hl is board unit shading,
    // hover is outline buttons and list rows — but a shared value means
    // changing one silently changes the other.
    for (const theme of THEMES) {
      expect(palettes[theme]['--hover'], theme).not.toBe(palettes[theme]['--cell-hl']);
    }
  });

  test('hover sits slightly further from the ground than unit shading, as in light', () => {
    // Hover is transient feedback and unit shading is persistent ambient, so
    // hover reads a touch stronger. That relationship is the design's own; it
    // just did not survive into dark.
    for (const theme of THEMES) {
      const ground = relativeLuminance(palettes[theme]['--bg']);
      const hover = Math.abs(relativeLuminance(palettes[theme]['--hover']) - ground);
      const unit = Math.abs(relativeLuminance(palettes[theme]['--cell-hl']) - ground);
      expect(hover, theme).toBeGreaterThan(unit);
    }
  });

  test('board shading stays ordered: selection reads strongest', () => {
    for (const theme of THEMES) {
      const ground = relativeLuminance(palettes[theme]['--bg']);
      const distance = (token: '--cell-hl' | '--cell-same' | '--cell-sel') =>
        Math.abs(relativeLuminance(palettes[theme][token]) - ground);
      expect(distance('--cell-sel'), theme).toBeGreaterThan(distance('--cell-same'));
      expect(distance('--cell-same'), theme).toBeGreaterThan(distance('--cell-hl'));
    }
  });
});

describe('every text pairing meets WCAG AA', () => {
  // The check the prototype failed nine times over. Computed from the palette,
  // so moving any colour fails here rather than at launch.
  for (const theme of THEMES) {
    for (const { foreground, backgrounds } of TEXT_PAIRINGS) {
      for (const background of backgrounds) {
        test(`${theme}: ${foreground} on ${background}`, () => {
          const ratio = contrastRatio(palettes[theme][foreground], palettes[theme][background]);
          expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        });
      }
    }
  }
});

describe('the note-on-selected-cell case', () => {
  test('clears AA with headroom in both themes', () => {
    // The worst pairing in the product and the one NONET-5 turned on. The
    // margin is deliberate: at exactly 4.50 a later tweak reintroduces the bug.
    for (const theme of THEMES) {
      const ratio = contrastRatio(palettes[theme]['--fg3-text'], palettes[theme]['--cell-sel']);
      expect(ratio, `${theme} ${ratio.toFixed(2)}:1`).toBeGreaterThan(4.7);
    }
  });
});

describe('TEXT_PAIRINGS', () => {
  test('names only tokens that exist', () => {
    for (const { foreground, backgrounds } of TEXT_PAIRINGS) {
      expect(COLOR_TOKENS).toContain(foreground);
      for (const background of backgrounds) expect(COLOR_TOKENS).toContain(background);
    }
  });

  test('covers every foreground the product actually renders text in', () => {
    expect(TEXT_PAIRINGS.map((pairing) => pairing.foreground).sort()).toEqual([
      '--accent',
      '--accent-ink',
      '--error',
      '--fg',
      '--fg2',
      '--fg3-text',
    ]);
  });
});
