import {createProject, quiltPackage, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'server', source: './source/server', runtime: Runtime.Node});
  pkg.use(quiltPackage({react: true}));
});
