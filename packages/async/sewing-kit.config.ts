import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({
    name: 'babel',
    source: './src/babel-plugin',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'rollup',
    source: './src/rollup-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'sewing-kit',
    source: './src/sewing-kit',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'server',
    source: './src/server',
    runtime: Runtime.Node,
  });

  pkg.use(
    quiltPackage({
      // We need commonjs for the Babel plugin
      commonjs: true,
    }),
  );
});
