import {defineConfig, defaultExclude} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['./**/*.test.ts'],
    exclude: [...defaultExclude, './tests/e2e/**/*.test.ts'],
  },
});
