import {createPackage, quiltPackage} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index.ts'});
  pkg.use(quiltPackage({react: true}));
});
