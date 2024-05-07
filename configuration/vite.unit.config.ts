import {defineConfig, configDefaults} from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  resolve: {
    conditions: ['quilt:source'],
  },
  test: {
    include: ['./**/*.test.ts', './**/*.test.tsx'],
    exclude: [
      ...configDefaults.exclude,
      './tests/e2e/**',
      './packages/create/templates/**',
    ],
  },
});
