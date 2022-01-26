import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';
import type {App} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(
    quiltApp({
      static: true,
      server: true,
    }),
    createProjectPlugin<App>({
      name: 'Quilt.AddInternalConditionForExamples',
      develop({configure}) {
        configure(({viteResolveExportConditions}) => {
          viteResolveExportConditions?.((exportConditions) => [
            'quilt:internal',
            ...exportConditions,
          ]);
        });
      },
      build({configure}) {
        configure(({rollupNodeExportConditions}) => {
          rollupNodeExportConditions?.((exportConditions) => [
            'quilt:internal',
            ...exportConditions,
          ]);
        });
      },
    }),
  );
});
