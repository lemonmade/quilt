import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({source: './src/node', name: 'node', runtime: Runtime.Node});
  pkg.use(quiltPackage());
});
