import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({source: './source/server', name: 'server', runtime: Runtime.Node});
  pkg.use(quiltPackage({react: true}));
});
