import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({
    name: 'rollup',
    source: './source/rollup-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({name: 'babel', source: './source/babel', runtime: Runtime.Node});

  // We need commonjs for the babel plugin
  pkg.use(quiltPackage({commonjs: true}));
});
