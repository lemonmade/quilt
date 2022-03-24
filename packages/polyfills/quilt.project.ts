import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({
    source: './src/rollup-parts',
    name: 'rollup',
    runtime: Runtime.Node,
  });

  pkg.entry({source: './src/base', name: 'base'});
  pkg.entry({source: './src/noop', name: 'noop'});
  pkg.entry({
    source: './src/fetch.browser',
    name: 'fetch.browser',
    runtime: Runtime.Browser,
  });
  pkg.entry({
    source: './src/fetch.node',
    name: 'fetch.node',
    runtime: Runtime.Node,
  });

  pkg.use(quiltPackage());
});
