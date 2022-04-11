import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './source/index'});
  pkg.entry({source: './source/node', name: 'node'});
  pkg.use(quiltPackage());
});
