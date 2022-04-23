import {createPackage, quiltPackage} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index.ts'});
  pkg.entry({name: 'http-handlers', source: './source/http-handlers.ts'});
  pkg.use(quiltPackage({react: true}));
});
