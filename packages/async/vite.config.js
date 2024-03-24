import {defineConfig} from 'vite';
import {quiltPackage} from '@quilted/vite/package';

export default defineConfig({
  plugins: [quiltPackage()],
});
