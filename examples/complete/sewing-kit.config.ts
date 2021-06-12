import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(
    createProjectPlugin({
      name: 'Quilt.App.Clean',
      build({project, workspace, run}) {
        run((step) =>
          step({
            stage: 'pre',
            name: 'Quilt.App.Clean',
            label: `Cleaning build directory for ${project.name}`,
            async run(step) {
              await step.exec('rm', ['-rf', workspace.fs.buildPath('app')]);
            },
          }),
        );
      },
    }),
    quiltApp(),
  );
});
