import {createPackage, Runtime} from '@sewing-kit/config';
import {nodeOnlyProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({root: './src/index'});
  pkg.plugin(nodeOnlyProjectPlugin);
});
