import {defineConfig, configDefaults} from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['quilt:source'],
  },
  test: {
    include: ['./**/*.test.ts'],
    exclude: [...configDefaults.exclude, './tests/e2e/**'],
  },
});
