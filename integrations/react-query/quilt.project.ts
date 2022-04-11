import {quiltPackage, createPackage} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.use(quiltPackage({react: true}));
});
