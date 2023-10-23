import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
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
    environment: 'jsdom',
    exclude: [
      ...configDefaults.exclude,
      // 'tests/e2e/**/*.test.ts',
      'packages/create/templates/**/*',
    ],
    watchExclude: [...configDefaults.watchExclude, 'tests/e2e/output/**/*'],
  },
});
