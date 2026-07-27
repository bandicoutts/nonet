import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    // The fuzz suite runs thousands of generator passes; give it room.
    testTimeout: 120_000,
  },
});
