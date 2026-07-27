/**
 * A small deterministic PRNG. Every generated puzzle is reproducible from its
 * seed, which is what lets the daily puzzle be minted identically anywhere and
 * lets a failing fuzz case be replayed from the seed the test prints.
 */
export interface Rng {
  /** A float in [0, 1). */
  next: () => number;
  /** An integer in [0, max). */
  int: (max: number) => number;
  /** A shuffled copy; the input is not mutated. */
  shuffle: <T>(items: readonly T[]) => T[];
}

/** mulberry32 — small, fast, and good enough for puzzle generation. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (max: number): number => Math.floor(next() * max);

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      const a = copy[i];
      const b = copy[j];
      if (a === undefined || b === undefined) continue;
      copy[i] = b;
      copy[j] = a;
    }
    return copy;
  };

  return { next, int, shuffle };
}
