import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node);
  pkg.use(quiltPackage());
});
