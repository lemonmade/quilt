import {defineConfig, configDefaults} from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    conditions: ['quilt:source'],
    alias: {
      '@quilted/react-testing/matchers': '@quilted/react-testing/matchers',
      '@quilted/react-testing': '@quilted/react-testing/preact',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react/jsx-dev-runtime': 'preact/jsx-runtime',
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
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
