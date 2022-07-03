import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'jsx-runtime', source: './source/jsx-runtime'});
  pkg.use(quiltPackage({react: true}));
});
