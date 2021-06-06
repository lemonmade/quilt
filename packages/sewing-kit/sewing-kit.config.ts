import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({source: './src/index'});
  pkg.binary({name: 'sewing-kit', source: './src/cli/cli', aliases: ['sk']});
  pkg.use(quiltPackage());
});
