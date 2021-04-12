import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/sewing-kit', name: 'sewing-kit'});
  pkg.entry({root: './src/http-handlers', name: 'http-handlers'});
  pkg.use(quiltPackage());
});
