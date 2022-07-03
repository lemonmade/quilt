import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.use(quiltPackage());
});
