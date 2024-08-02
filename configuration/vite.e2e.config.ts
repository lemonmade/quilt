import {defineConfig} from 'vitest/config';

export default defineConfig({
  esbuild: {
    // Without this, vitest preserves `using` statements, which aren’t supported in Node.
    target: 'es2022',
  },
  server: {
    watch: {
      ignored: ['./tests/e2e/output/'],
    },
  },
  test: {
    testTimeout: 20_000,
    include: ['./tests/e2e/**/*.test.ts'],
  },
});
