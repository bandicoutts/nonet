import { describe, expect, test } from 'vitest';
import { AA_LARGE_TEXT, AA_NORMAL_TEXT, contrastRatio, meetsAA, relativeLuminance } from '../src/contrast';

describe('relativeLuminance', () => {
  test('black is 0 and white is 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  test('accepts a hex string with or without the hash', () => {
    expect(relativeLuminance('F1F2F3')).toBeCloseTo(relativeLuminance('#F1F2F3'), 10);
  });

  test('is case-insensitive', () => {
    expect(relativeLuminance('#f1f2f3')).toBeCloseTo(relativeLuminance('#F1F2F3'), 10);
  });

  test('rejects anything that is not a 6-digit hex colour', () => {
    expect(() => relativeLuminance('#FFF')).toThrow(/hex/i);
    expect(() => relativeLuminance('rebeccapurple')).toThrow(/hex/i);
  });
});

describe('contrastRatio', () => {
  test('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  test('a colour against itself is 1:1', () => {
    expect(contrastRatio('#2C41C4', '#2C41C4')).toBeCloseTo(1, 5);
  });

  test('is symmetric — order does not matter', () => {
    expect(contrastRatio('#16181B', '#F1F2F3')).toBeCloseTo(
      contrastRatio('#F1F2F3', '#16181B'),
      10,
    );
  });

  test('reproduces the figures published in the design export', () => {
    // Spot-checks against design/export/tokens.json → color.contrast.
    // These verify the transcription, not the maths.
    expect(contrastRatio('#16181B', '#F1F2F3')).toBeCloseTo(15.87, 1);
    expect(contrastRatio('#4B5157', '#F1F2F3')).toBeCloseTo(7.17, 1);
    expect(contrastRatio('#2C41C4', '#F1F2F3')).toBeCloseTo(7.04, 1);
    expect(contrastRatio('#A9231A', '#F1F2F3')).toBeCloseTo(6.37, 1);
    expect(contrastRatio('#93A6FF', '#131518')).toBeCloseTo(7.96, 1);
  });

  test('confirms the defect the export recorded for the old --fg3', () => {
    // The value NONET-5 replaced, kept as a regression marker: if someone
    // reinstates #6C7278 for text, this is what they are reinstating.
    expect(contrastRatio('#6C7278', '#F1F2F3')).toBeCloseTo(4.34, 1);
    expect(contrastRatio('#6C7278', '#D7DDF9')).toBeCloseTo(3.61, 1);
  });
});

describe('meetsAA', () => {
  test('normal text needs 4.5:1', () => {
    expect(AA_NORMAL_TEXT).toBe(4.5);
    expect(meetsAA(4.5)).toBe(true);
    expect(meetsAA(4.49)).toBe(false);
  });

  test('large text needs 3:1', () => {
    expect(AA_LARGE_TEXT).toBe(3);
    expect(meetsAA(3, { large: true })).toBe(true);
    expect(meetsAA(2.99, { large: true })).toBe(false);
  });
});
