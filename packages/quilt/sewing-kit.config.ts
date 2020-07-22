import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/server', name: 'server', runtime: Runtime.Node});
  pkg.entry({root: './src/testing', name: 'testing', runtime: Runtime.Node});
  pkg.entry({root: './src/matchers', name: 'matchers', runtime: Runtime.Node});
  pkg.use(quiltPackage());
});
