import {
  createPackage,
  quiltPackage,
  Runtime,
  createProjectPlugin,
} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({source: './src/http', name: 'http'});
  pkg.entry({source: './src/html', name: 'html'});
  pkg.entry({source: './src/email', name: 'email'});
  pkg.entry({source: './src/server', name: 'server', runtime: Runtime.Node});
  pkg.entry({source: './src/testing', name: 'testing', runtime: Runtime.Node});
  pkg.entry({
    source: './src/matchers',
    name: 'matchers',
    runtime: Runtime.Node,
  });
  pkg.entry({
    source: './src/magic/app-http-handler',
    name: 'magic-app-http-handler',
    runtime: Runtime.Node,
  });

  pkg.use(
    quiltPackage({react: true}),
    createProjectPlugin({
      name: 'QuiltInternal.ExtraExternals',
      build({configure}) {
        configure(({rollupExternals}) => {
          rollupExternals?.((externals) => {
            // We use this name for some imports that are only
            // created at build time.
            externals.push(/__quilt__/);

            return externals;
          });
        });
      },
    }),
  );
});
