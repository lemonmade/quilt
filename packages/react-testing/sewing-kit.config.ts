import {createPackage} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({name: 'dom', root: './src/implementations/react-dom'});
  pkg.entry({name: 'preact', root: './src/implementations/preact'});
  pkg.use(quiltPackage());
});
