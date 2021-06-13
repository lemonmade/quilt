import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({source: './src/http', name: 'http'});
  pkg.entry({source: './src/html', name: 'html'});
  pkg.entry({source: './src/email', name: 'email'});
  pkg.entry({source: './src/global', name: 'global'});
  pkg.entry({source: './src/server', name: 'server', runtime: Runtime.Node});
  pkg.entry({source: './src/testing', name: 'testing', runtime: Runtime.Node});
  pkg.entry({
    source: './src/matchers',
    name: 'matchers',
    runtime: Runtime.Node,
  });

  pkg.use(quiltPackage({react: true}));
});
