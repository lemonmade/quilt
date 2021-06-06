import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({
    name: 'worker',
    source: './src/worker',
    runtime: Runtime.Browser,
  });
  pkg.use(quiltPackage());
});
