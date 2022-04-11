import {quiltPackage, createPackage} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'craft', source: './source/craft'});
  pkg.use(quiltPackage({react: true}));
});
