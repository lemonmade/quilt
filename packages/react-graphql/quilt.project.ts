import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({
    name: 'testing',
    source: './source/testing',
    runtime: Runtime.Node,
  });
  pkg.use(quiltPackage({react: true}));
});
