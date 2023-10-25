import {defineConfig, configDefaults, defaultExclude} from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['quilt:source'],
  },
  test: {
    include: ['./**/*.test.ts'],
    exclude: [...defaultExclude, './tests/e2e/**/*.test.ts'],
  },
});
