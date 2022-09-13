import {quiltPackage, createProject, createProjectPlugin} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      executable: {
        quilt: './source/cli/cli.ts',
      },
    }),
    createProjectPlugin({
      name: 'Quilt.Craft.VmModules',
      build({configure}) {
        configure(({packageExecutableNodeOptions}) => {
          packageExecutableNodeOptions?.((options) => [
            ...options,
            // Allow vm modules, since some development plugins (like the Miniflare one)
            // use VM modules under the hood.
            '--experimental-vm-modules',
          ]);
        });
      },
    }),
  );
});
