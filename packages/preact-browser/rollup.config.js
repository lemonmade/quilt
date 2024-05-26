import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  entries: {
    '.': './source/index.ts',
    './server': './source/server.ts',
    './server.browser': './source/server.browser.ts',
    './testing': './source/testing.ts',
  },
});
