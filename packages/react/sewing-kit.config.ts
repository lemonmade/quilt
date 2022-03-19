import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({name: 'jsx-runtime', source: './src/jsx-runtime'});
  pkg.entry({name: 'server', source: './src/server', runtime: Runtime.Node});
  pkg.entry({name: 'test-utils', source: './src/test-utils'});
  pkg.use(quiltPackage({react: true}));
});
