import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index.ts'});
  pkg.entry({name: 'http-handlers', source: './source/http-handlers.ts'});
  pkg.use(quiltPackage({react: true}));
});
