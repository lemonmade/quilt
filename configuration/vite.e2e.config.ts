import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 20_000,
    include: ['./tests/e2e/**/*.test.ts'],
  },
});
