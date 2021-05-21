import {stripIndent} from 'common-tags';
import {WebApp, Target, createProjectPlugin, Task} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildWebAppTargetOptions,
} from '@sewing-kit/hooks';
import type {} from '@sewing-kit/plugin-rollup';
import type {Manifest} from '@quilted/async/assets';

import {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_ASSET_MANIFEST,
} from './constants';

interface IncludeDetails {
  readonly task: Task;
  readonly target?: Target<WebApp, BuildWebAppTargetOptions>;
}

interface Options {
  include?(details: IncludeDetails): boolean;
}

export function webAppMagicModules({include = () => true}: Options = {}) {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppMagicModules',
    ({project, workspace, tasks}) => {
      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({target, hooks}) => {
          if (!include({target, task: Task.Dev})) return;

          hooks.configure.hook(addMagicModules);
        });
      });

      tasks.dev.hook(({hooks}) => {
        if (!include({task: Task.Build})) return;

        hooks.configure.hook(addMagicModules);
      });

      function addMagicModules({
        rollupPlugins,
      }: BuildWebAppConfigurationHooks | DevWebAppConfigurationHooks) {
        rollupPlugins?.hook((plugins) => [
          {
            name: '@quilted/web-app/magic-modules',
            // eslint-disable-next-line react/function-component-definition
            resolveId(id) {
              switch (id) {
                case MAGIC_MODULE_APP_ASSET_MANIFEST:
                  return id;
                case MAGIC_MODULE_APP_COMPONENT:
                  return project.fs.resolvePath(project.entry ?? 'index');
                default:
                  return null;
              }
            },
            async load(id) {
              switch (id) {
                case MAGIC_MODULE_APP_ASSET_MANIFEST: {
                  const manifestFiles = await project.fs.glob(
                    workspace.fs.buildPath(
                      workspace.webApps.length > 1
                        ? `apps/${project.name}`
                        : 'app',
                      '**/*.manifest.json',
                    ),
                  );

                  const manifests: Manifest[] = await Promise.all(
                    manifestFiles.map(async (file) =>
                      JSON.parse(await workspace.fs.read(file)),
                    ),
                  );

                  return stripIndent`
                    import {createAssetLoader} from '@quilted/async/assets';

                    const manifests = ${JSON.stringify(manifests.reverse())};

                    // TODO: this will not scale too well once we introduce locales, too!
                    const assets = createAssetLoader({
                      getManifest: (options) => {
                        const manifest = manifests.find((manifest) => {
                          return manifest.match.every((aMatch) => {
                            switch (aMatch.type) {
                              case 'regex': {
                                return new RegExp(aMatch.source).test(options[aMatch.key]);
                              }
                              default: {
                                throw new Error('Can’t handle match: ', aMatch);
                              }
                            }
                          });
                        }) || manifests.find((manifest) => manifest.default);

                        if (manifest == null) {
                          throw new Error('No manifest found for options: ', options);
                        }

                        return Promise.resolve(manifest);
                      },
                    });
  
                    export default assets;
                  `;
                }
                default:
                  return null;
              }
            },
          },
          ...plugins,
        ]);
      }
    },
  );
}
