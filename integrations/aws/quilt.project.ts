import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './source/index'});
  pkg.entry({source: './source/craft', name: 'craft'});
  pkg.entry({source: './source/http-handlers', name: 'http-handlers'});
  pkg.use(quiltPackage());
});