import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

const POLYFILLS = ['fetch'];

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/base', name: 'base'});
  pkg.entry({root: './src/noop', name: 'noop'});

  for (const polyfill of POLYFILLS) {
    pkg.entry({root: `./src/${polyfill}`, name: polyfill});
    pkg.entry({
      root: `./src/${polyfill}.browser`,
      name: `${polyfill}.browser`,
      runtime: Runtime.Browser,
    });
    pkg.entry({
      root: `./src/${polyfill}.node`,
      name: `${polyfill}.node`,
      runtime: Runtime.Node,
    });
  }

  pkg.use(quiltPackage());
});
