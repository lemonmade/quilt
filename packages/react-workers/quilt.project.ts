import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({
    name: 'worker',
    source: './source/worker',
    runtime: Runtime.Browser,
  });
  pkg.use(quiltPackage({react: true}));
});
