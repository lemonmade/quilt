import {createProject, quiltPackage, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({source: './source/testing', name: 'testing'});
  pkg.entry({source: './source/server', name: 'server', runtime: Runtime.Node});
  pkg.use(quiltPackage({react: true}));
});
