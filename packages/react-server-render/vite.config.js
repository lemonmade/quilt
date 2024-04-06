import {quiltPackage} from '@quilted/vite/package';

export default {
  esbuild: {
    // Without this, vitest preserves `using` statemenets, which aren’t supported in Node.
    target: 'es2022',
  },
  plugins: [quiltPackage()],
};
