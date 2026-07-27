import { describe, expect, test } from 'vitest';
import { createRng } from '../src/rng.ts';

describe('createRng', () => {
  test('is deterministic for a given seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const first = Array.from({ length: 20 }, () => a.next());
    const second = Array.from({ length: 20 }, () => b.next());
    expect(second).toEqual(first);
  });

  test('different seeds diverge', () => {
    const a = Array.from({ length: 20 }, createRng(1).next);
    const b = Array.from({ length: 20 }, createRng(2).next);
    expect(b).not.toEqual(a);
  });

  test('next stays in [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('int stays within bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.int(10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  test('shuffle permutes without losing or duplicating items', () => {
    const source = Array.from({ length: 50 }, (_, i) => i);
    const shuffled = createRng(3).shuffle(source);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(source);
    expect(shuffled).not.toEqual(source);
  });

  test('shuffle does not mutate its input', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const copy = [...source];
    createRng(4).shuffle(source);
    expect(source).toEqual(copy);
  });

  test('the same seed shuffles the same way', () => {
    const source = Array.from({ length: 30 }, (_, i) => i);
    expect(createRng(8).shuffle(source)).toEqual(createRng(8).shuffle(source));
  });
});
