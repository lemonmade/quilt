import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'craft', source: './source/craft'});
  pkg.use(quiltPackage({react: true}));
});
