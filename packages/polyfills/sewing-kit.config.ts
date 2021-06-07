import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

const POLYFILLS = ['fetch'];

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({
    source: './src/rollup-parts',
    name: 'rollup',
    runtime: Runtime.Node,
  });
  pkg.entry({
    source: './src/sewing-kit',
    name: 'sewing-kit',
    runtime: Runtime.Node,
  });

  pkg.entry({source: './src/base', name: 'base'});
  pkg.entry({source: './src/noop', name: 'noop'});

  for (const polyfill of POLYFILLS) {
    pkg.entry({source: `./src/${polyfill}`, name: polyfill});
    pkg.entry({
      source: `./src/${polyfill}.browser`,
      name: `${polyfill}.browser`,
      runtime: Runtime.Browser,
    });
    pkg.entry({
      source: `./src/${polyfill}.node`,
      name: `${polyfill}.node`,
      runtime: Runtime.Node,
    });
  }

  pkg.use(quiltPackage());
});
