import { describe, expect, test } from 'vitest';
import { BREAKPOINTS, VIEWPORTS } from '../src/viewports.js';
import { TYPE_ROLES, resolveType } from '../src/type.js';
import { SPACE } from '../src/space.js';
import { MOTION } from '../src/motion.js';
import { BORDERS } from '../src/border.js';
import { SHADOWS } from '../src/shadow.js';
import { RADIUS } from '../src/radius.js';
import { HATCH } from '../src/hatch.js';

describe('viewports and breakpoints', () => {
  test('the design was drawn at three widths', () => {
    expect([...VIEWPORTS]).toEqual([390, 834, 1440]);
  });

  test('layout switches are separate from the drawing widths', () => {
    // NONET-2: mobile drawer below 768, board rail at 1100 and up. Those are
    // where CSS actually switches; 390/834/1440 are only where it was drawn.
    expect(BREAKPOINTS.drawer).toBe(768);
    expect(BREAKPOINTS.rail).toBe(1100);
  });
});

describe('type roles', () => {
  test('carries every role from the export', () => {
    expect(Object.keys(TYPE_ROLES).sort()).toEqual(
      [
        'body',
        'body-small',
        'button',
        'cell-digit',
        'cell-note',
        'chip',
        'control',
        'display',
        'hero-number',
        'kicker',
        'mono-data',
        'mono-label',
        'month-number',
        'result-number',
        'stat-number',
        'streak-number',
        'timer',
        'wordmark',
      ].sort(),
    );
  });

  test('every role names a real family', () => {
    for (const [name, role] of Object.entries(TYPE_ROLES)) {
      expect(['sans', 'mono'], name).toContain(role.family);
    }
  });

  test('resolveType flattens a responsive role at a viewport', () => {
    expect(resolveType('display', 390).size).toBe(32);
    expect(resolveType('display', 834).size).toBe(44);
    expect(resolveType('display', 1440).size).toBe(56);
  });

  test('resolveType passes a flat role through unchanged at every viewport', () => {
    for (const viewport of VIEWPORTS) {
      expect(resolveType('kicker', viewport).size).toBe(11);
      expect(resolveType('kicker', viewport).letterSpacing).toBe('0.22em');
    }
  });

  test('resolves per-viewport letter spacing', () => {
    expect(resolveType('control', 390).letterSpacing).toBe('0.04em');
    expect(resolveType('control', 1440).letterSpacing).toBe('0.13em');
  });

  test('cell digits are bold as givens and regular as player entries', () => {
    expect(resolveType('cell-digit', 1440, 'given').weight).toBe(600);
    expect(resolveType('cell-digit', 1440, 'entry').weight).toBe(400);
  });

  test('numbers that must not jitter are tabular', () => {
    for (const role of ['hero-number', 'result-number', 'streak-number', 'timer', 'stat-number', 'cell-digit', 'mono-data'] as const) {
      expect(TYPE_ROLES[role].tabular, role).toBe(true);
    }
  });

  test('mono roles are uppercase, matching the design language', () => {
    for (const role of ['control', 'kicker', 'mono-label', 'chip', 'button'] as const) {
      expect(TYPE_ROLES[role].family, role).toBe('mono');
      expect(TYPE_ROLES[role].case, role).toBe('uppercase');
    }
  });
});

describe('space', () => {
  test('is the published 12-step scale', () => {
    expect(Object.keys(SPACE)).toHaveLength(12);
    expect(SPACE['space-3xs']).toBe(4);
    expect(SPACE['space-4xl']).toBe(88);
  });

  test('ascends without repeats', () => {
    const values = Object.values(SPACE);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i] ?? 0).toBeGreaterThan(values[i - 1] ?? 0);
    }
  });
});

describe('motion', () => {
  test('carries the published durations', () => {
    expect(MOTION.duration.hover).toBe(150);
    expect(MOTION.duration.place).toBe(180);
    expect(MOTION.duration.reveal).toBe(420);
    expect(MOTION.duration['toast-dwell']).toBe(1800);
  });

  test('place and reveal share the design easing', () => {
    expect(MOTION.easing.place).toBe('cubic-bezier(.2,.8,.3,1)');
    expect(MOTION.easing.reveal).toBe(MOTION.easing.place);
  });

  test('reduced motion collapses to a value that is effectively instant', () => {
    expect(MOTION.reducedMotionDuration).toBe(1);
  });
});

describe('borders, shadow, radius and hatch', () => {
  test('every corner in the product is square', () => {
    expect(RADIUS.none).toBe(0);
  });

  test('border recipes reference tokens rather than literal colours', () => {
    for (const [name, value] of Object.entries(BORDERS)) {
      expect(value, name).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  test('the cell and focus recipes the board depends on are present', () => {
    expect(BORDERS['cell-thin']).toContain('var(--line)');
    expect(BORDERS['cell-box']).toContain('var(--rule)');
    expect(BORDERS['selected-ring']).toContain('var(--accent)');
    expect(BORDERS['focus-ring']).toContain('var(--fg)');
  });

  test('elevation is the single drop shadow in the product', () => {
    expect(Object.keys(SHADOWS.light)).toEqual(['elevation']);
    expect(Object.keys(SHADOWS.dark)).toEqual(['elevation']);
  });

  test('the shadow re-tones for dark (DECISIONS.md NONET-7)', () => {
    // A black shadow over a near-black scrim reads as nothing. Dark needs a
    // heavier alpha to contribute at all.
    expect(SHADOWS.light.elevation).not.toBe(SHADOWS.dark.elevation);
    expect(SHADOWS.light.elevation).toContain('0.14');
    expect(SHADOWS.dark.elevation).toContain('0.55');
  });

  test('both shadows keep the same geometry — only the alpha changes', () => {
    expect(SHADOWS.light.elevation).toContain('0 24px 60px');
    expect(SHADOWS.dark.elevation).toContain('0 24px 60px');
  });

  test('the spent-key hatch is the non-colour cue for a spent pad key', () => {
    expect(HATCH['spent-key']).toContain('repeating-linear-gradient');
    expect(HATCH['spent-key']).toContain('var(--line2)');
  });
});
