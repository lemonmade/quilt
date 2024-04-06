import {defineConfig, configDefaults} from 'vitest/config';

export default defineConfig({
  esbuild: {
    // Without this, vitest preserves `using` statemenets, which aren’t supported in Node.
    target: 'es2022',
  },
  test: {
    testTimeout: 20_000,
    include: ['./tests/e2e/**/*.test.ts'],
    watchExclude: [...configDefaults.watchExclude, './tests/e2e/output/**'],
  },
});
