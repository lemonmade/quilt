import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({source: './source/static', name: 'static', runtime: Runtime.Node});
  pkg.entry({
    source: './source/testing',
    name: 'testing',
    runtime: Runtime.Node,
  });
  pkg.use(quiltPackage({react: true}));
});
