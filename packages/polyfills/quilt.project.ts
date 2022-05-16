import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({
    source: './source/rollup-parts',
    name: 'rollup',
    runtime: Runtime.Node,
  });

  pkg.entry({source: './source/base', name: 'base'});
  pkg.entry({source: './source/noop', name: 'noop'});
  pkg.entry({
    source: './source/fetch.browser',
    name: 'fetch.browser',
    runtime: Runtime.Browser,
  });
  pkg.entry({
    source: './source/fetch.node',
    name: 'fetch.node',
    runtime: Runtime.Node,
  });
  pkg.entry({
    source: './source/abort-controller',
    name: 'abort-controller',
    runtime: Runtime.Node,
  });

  pkg.use(quiltPackage());
});
