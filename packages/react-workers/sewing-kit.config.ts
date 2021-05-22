import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.entry({
    name: 'worker',
    root: './src/worker',
    runtime: Runtime.WebWorker,
  });
  pkg.use(quiltPackage());
});
