import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './src/index'});
  pkg.entry({source: './src/node', name: 'node'});
  pkg.use(quiltPackage());
});
