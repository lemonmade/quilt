import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index.ts'});
  pkg.entry({name: 'global', source: './source/global.ts'});
  pkg.entry({
    name: 'rollup',
    source: './source/rollup-parts.ts',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'babel',
    source: './source/babel-plugin.ts',
    runtime: Runtime.Node,
  });
  pkg.use(quiltPackage());
});
