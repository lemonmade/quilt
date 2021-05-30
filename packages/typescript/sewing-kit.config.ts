import {createPackage} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.use(quiltPackage());
});
