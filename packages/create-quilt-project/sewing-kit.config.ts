import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.binary({name: 'create-quilt-project', root: './src/index', aliases: []});
  pkg.use(quiltPackage({binaryOnly: true}));
});
