import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({source: './src/http', name: 'http'});
  pkg.entry({source: './src/html', name: 'html'});
  pkg.entry({source: './src/email', name: 'email'});
  pkg.entry({source: './src/global', name: 'global'});
  pkg.entry({source: './src/env', name: 'env'});
  pkg.entry({source: './src/react', name: 'react'});
  pkg.entry({
    source: './src/react/server',
    name: 'react/server',
    runtime: Runtime.Node,
  });
  pkg.entry({source: './src/react/jsx-runtime', name: 'react/jsx-runtime'});
  pkg.entry({source: './src/http-handlers', name: 'http-handlers'});
  pkg.entry({
    source: './src/http-handlers/node',
    name: 'http-handlers/node',
    runtime: Runtime.Node,
  });
  pkg.entry({source: './src/polyfills/base', name: 'polyfills/base'});
  pkg.entry({source: './src/polyfills/fetch', name: 'polyfills/fetch'});
  pkg.entry({source: './src/polyfills/noop', name: 'polyfills/noop'});
  pkg.entry({source: './src/server', name: 'server', runtime: Runtime.Node});
  pkg.entry({source: './src/static', name: 'static', runtime: Runtime.Node});
  pkg.entry({source: './src/testing', name: 'testing', runtime: Runtime.Node});
  pkg.entry({
    source: './src/matchers',
    name: 'matchers',
    runtime: Runtime.Node,
  });

  pkg.use(quiltPackage({react: true}));
});
