import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({
    name: 'worker',
    root: './src/worker',
    runtime: Runtime.WebWorker,
  });
  pkg.entry({
    name: 'worker-wrapper-callable',
    root: './src/wrappers/callable',
    runtime: Runtime.WebWorker,
  });
  pkg.entry({
    name: 'worker-wrapper-basic',
    root: './src/wrappers/basic',
    runtime: Runtime.WebWorker,
  });
  pkg.use(quiltPackage());
});
