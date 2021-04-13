import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/http', name: 'http'});
  pkg.entry({root: './src/html', name: 'html'});
  pkg.entry({root: './src/email', name: 'email'});
  pkg.entry({root: './src/server', name: 'server', runtime: Runtime.Node});
  pkg.entry({root: './src/testing', name: 'testing', runtime: Runtime.Node});
  pkg.entry({root: './src/matchers', name: 'matchers', runtime: Runtime.Node});
  pkg.entry({
    root: './src/magic/app-http-handler',
    name: 'magic-app-http-handler',
    runtime: Runtime.Node,
  });
  pkg.use(quiltPackage());
});
