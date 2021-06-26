import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({
    name: 'worker',
    source: './src/worker',
    runtime: Runtime.Browser,
  });
  pkg.entry({
    name: 'rollup',
    source: './src/rollup-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({name: 'babel', source: './src/babel', runtime: Runtime.Node});
  pkg.entry({
    name: 'sewing-kit',
    source: './src/sewing-kit',
    runtime: Runtime.Node,
  });

  // We need commonjs for the babel plugin
  pkg.use(quiltPackage({commonjs: true}));
});
