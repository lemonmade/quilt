import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './source/index'});
  pkg.use(quiltPackage());
});
