import {createProjectPlugin} from '@quilted/craft';
import type {
  App,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '@quilted/sewing-kit';

export function addInternalExportCondition() {
  return createProjectPlugin<App>({
    name: 'Quilt.E2E.AddInternalExportCondition',
    build({configure, project}) {
      configure(addRollupConfiguration(project));
    },
    develop({configure, project}) {
      configure(addRollupConfiguration(project));
    },
  });
}

function addRollupConfiguration(app: App) {
  return ({
    rollupNodeExportConditions,
    rollupPlugins,
  }:
    | ResolvedBuildProjectConfigurationHooks<App>
    | ResolvedDevelopProjectConfigurationHooks<App>) => {
    rollupPlugins?.(async (plugins) => {
      const {default: alias} = await import('@rollup/plugin-alias');

      plugins.push(
        alias({
          entries: {
            'e2e/globals': app.fs.resolvePath('../../common/globals.ts'),
          },
        }),
      );

      return plugins;
    });

    rollupNodeExportConditions?.((conditions) => [
      'quilt:internal',
      ...conditions,
    ]);
  };
}
