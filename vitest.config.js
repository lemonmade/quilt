import {defineConfig} from 'vitest/config';

// Vitest 4 removed the standalone `vitest.workspace` file; the project globs it
// used to hold now live under `test.projects`.
export default defineConfig({
  test: {
    projects: ['packages/*/vite.config.{js,ts}'],
  },
});
