import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index.ts'});
  pkg.use(quiltPackage({react: false}));
});
