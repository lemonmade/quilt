import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'jsx-runtime', source: './source/jsx-runtime'});
  pkg.entry({name: 'server', source: './source/server', runtime: Runtime.Node});
  pkg.entry({name: 'test-utils', source: './source/test-utils'});
  pkg.use(quiltPackage({react: true}));
});
