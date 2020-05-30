import {createPackage, Runtime} from '@sewing-kit/config';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({name: 'dom', root: './src/implementations/react-dom'});
  pkg.entry({name: 'preact', root: './src/implementations/preact'});
  pkg.entry({
    name: 'matchers',
    root: './src/matchers/index',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'dom-matchers',
    root: './src/matchers/dom',
    runtime: Runtime.Node,
  });
  pkg.use(quiltPackage());
});
