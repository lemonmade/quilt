import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage, terser} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.use(
    quiltPackage(),
    // @see https://github.com/preactjs/preact/blob/master/mangle.json
    terser({
      nameCache: 'config/terser/name-cache.json',
      mangle: {
        properties: {
          regex: '^_[^_]',
          reserved: [
            '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
            '__REACT_DEVTOOLS_GLOBAL_HOOK__',
            '__PREACT_DEVTOOLS__',
            '_renderers',
            '__source',
            '__self',
          ],
        },
      },
    }),
  );
});
