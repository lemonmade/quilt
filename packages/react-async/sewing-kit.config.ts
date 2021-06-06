import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({name: 'server', source: './src/server', runtime: Runtime.Node});
  pkg.use(quiltPackage());
});
