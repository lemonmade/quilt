import {createPackage, Runtime} from '@sewing-kit/config';
import {createProjectTestPlugin} from '@sewing-kit/plugins';
import {quiltPackage} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/testing', name: 'testing', runtime: Runtime.Node});
  pkg.use(
    createProjectTestPlugin('MyPlugin', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestEnvironment?.hook(() => 'jsdom');
      });
    }),
  );
  pkg.use(quiltPackage());
});
