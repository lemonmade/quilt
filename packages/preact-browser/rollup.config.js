import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  entries: (defaultEntries) => ({
    ...defaultEntries,
    // The extra `server.{esm,cjs,esnext}.browser` entrypoint is the only
    // thing that points to this source file, and Quilt doesn’t know it should
    // handle this file. Maybe we should just collect all source code entries?
    './server.browser': './source/server.browser.ts',
  }),
});
