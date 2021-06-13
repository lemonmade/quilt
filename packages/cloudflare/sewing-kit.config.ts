import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './src/index'});
  pkg.entry({source: './src/sewing-kit', name: 'sewing-kit'});
  pkg.entry({source: './src/http-handlers', name: 'http-handlers'});
  pkg.use(quiltPackage({react: true}));
});
