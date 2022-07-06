import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      // Need to manually declare these because Quilt can’t determine them automatically
      // from the complex export conditions of this package.
      entries: {
        '.': './source/index.ts',
        base: './source/base.ts',
        noop: './source/noop.ts',
        'fetch.browser': './source/fetch.browser.ts',
        'fetch.node': './source/fetch.node.ts',
        'abort-controller': './source/abort-controller.ts',
      },
    }),
  );
});
