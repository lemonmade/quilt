import {createProject, quiltPackage, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index', runtime: Runtime.Node});
  pkg.entry({name: 'server', source: './source/server', runtime: Runtime.Node});
  pkg.entry({name: 'test-utils', source: './source/test-utils'});
  pkg.use(quiltPackage());
});
