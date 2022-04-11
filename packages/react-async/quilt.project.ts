import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'server', source: './source/server', runtime: Runtime.Node});
  pkg.use(quiltPackage({react: true}));
});
