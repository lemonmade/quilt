import {quiltPackage, createProject, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './source/index'});
  pkg.use(quiltPackage());
});
