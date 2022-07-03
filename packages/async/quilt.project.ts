import {quiltPackage, createProject, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({
    name: 'babel',
    source: './source/babel-plugin',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'rollup',
    source: './source/rollup-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'server',
    source: './source/server',
    runtime: Runtime.Node,
  });

  pkg.use(
    quiltPackage({
      // We need commonjs for the Babel plugin
      commonjs: true,
    }),
  );
});
