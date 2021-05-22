import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.binary({name: 'create-quilt-project', root: './src/index'});
  pkg.use(quiltPackage());
});
