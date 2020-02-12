import {createPackage, Runtime} from '@sewing-kit/config';
import {createProjectBuildPlugin} from '@sewing-kit/plugins';
import {defaultProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({
    name: 'sewing-kit',
    root: './src/sewing-kit',
    runtime: Runtime.Node,
  });
  pkg.use(defaultProjectPlugin);
  pkg.use(copyWrappersPlugin);
});

const copyWrappersPlugin = createProjectBuildPlugin(
  'QuiltWebWorkers.CopyWrappers',
  ({api, hooks, project}) => {
    hooks.steps.hook((steps, {variant}) => [
      ...steps,
      api.createStep(
        {id: 'QuiltWebWorkers.CopyWrappers', label: 'Copying wrapper files'},
        async () => {
          const {copy} = await import('fs-extra');
          await copy(
            project.fs.resolvePath('src/wrappers'),
            project.fs.buildPath(Object.keys(variant)[0], 'wrappers'),
            {
              overwrite: true,
              recursive: true,
            },
          );
        },
      ),
    ]);
  },
);
