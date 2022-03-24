import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './src/index'});
  pkg.entry({name: 'kit', source: './src/kit'});
  pkg.binary({name: 'quilt', source: './src/cli/cli'});
  pkg.use(quiltPackage());
});
