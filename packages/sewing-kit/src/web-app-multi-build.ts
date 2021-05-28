import {
  createProjectPlugin,
  WebApp,
  WaterfallHook,
  addHooks,
  Runtime,
} from '@sewing-kit/plugins';
import type {BuildWebAppTargetOptions} from '@sewing-kit/hooks';
import {updateSewingKitBabelPreset} from '@sewing-kit/plugin-javascript';
import {updatePostcssEnvPreset} from '@sewing-kit/plugin-css';

import type {} from '@sewing-kit/plugin-rollup';

import {idFromTargetOptions} from './shared';

interface CustomHooks {
  readonly quiltBrowserslist: WaterfallHook<string | string[] | undefined>;
}

interface CustomOptions {
  readonly browsers?: string;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppTargetOptions extends CustomOptions {}
  interface DevWebAppTargetOptions extends CustomOptions {}
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}
}

const LATEST_EVERGREEN = [
  'last 1 chrome versions',
  'last 1 chromeandroid versions',
  'last 1 firefox versions',
  'last 1 firefoxandroid versions',
  'last 1 opera versions',
  'last 1 operamobile versions',
  'last 1 edge versions',
  'safari >= 13',
  'ios >= 13',
];

const DEFAULT_BROWSER_GROUPS = {
  latest: LATEST_EVERGREEN,
};

const PLUGIN = 'Quilt.WebAppMultiBuilds';

export interface Options {
  readonly babel?: boolean;
  readonly postcss?: boolean;
  readonly browserGroups?:
    | {readonly [key: string]: string | string[]}
    | string[];
}

export function webAppMultiBuilds({
  babel = true,
  postcss = true,
  browserGroups: explicitBrowserGroups = DEFAULT_BROWSER_GROUPS,
}: Options = {}) {
  const browserGroups = Array.isArray(explicitBrowserGroups)
    ? explicitBrowserGroups
    : Object.keys(explicitBrowserGroups);
  const browserGroupMap = new Map<string, string | string[]>();

  if (!Array.isArray(explicitBrowserGroups)) {
    for (const group of browserGroups) {
      browserGroupMap.set(group, explicitBrowserGroups[group]);
    }
  }

  return createProjectPlugin<WebApp>(PLUGIN, ({project, workspace, tasks}) => {
    tasks.build.hook(({hooks}) => {
      hooks.targets.hook((targets) =>
        targets.map((target) =>
          target.default && !target.runtime.includes(Runtime.Node)
            ? target.multiply((currentTarget) =>
                ['default', ...browserGroups].map((browsers) => ({
                  ...currentTarget,
                  browsers: browsers as BuildWebAppTargetOptions['browsers'],
                })),
              )
            : target,
        ),
      );

      hooks.configureHooks.hook(
        addHooks<CustomHooks>(() => ({
          quiltBrowserslist: new WaterfallHook(),
        })),
      );

      hooks.target.hook(({target, hooks}) => {
        const id = idFromTargetOptions(target.options);

        hooks.configure.hook((configuration) => {
          const {browsers} = target.options;

          configuration.rollupOutputs?.hook((outputs) => {
            if (target.options.quiltAutoServer) return outputs;

            return [
              ...outputs,
              {
                format: 'system',
                entryFileNames: `[name].${id}.[hash].js`,
                assetFileNames: `[name].${id}.[hash].[ext]`,
                chunkFileNames: `[name].${id}.[hash].js`,
                dir: workspace.fs.buildPath(
                  workspace.webApps.length > 1 ? `apps/${project.name}` : 'app',
                  'assets',
                ),
              },
            ];
          });

          if (browsers == null) return;

          // configuration.webpackPlugins?.hook(async (plugins) => {
          //   const [
          //     {ManifestPlugin},
          //     {getUserAgentRegExp},
          //     browserslist,
          //   ] = await Promise.all([
          //     import('./webpack/ManifestPlugin'),
          //     import('browserslist-useragent-regexp'),
          //     configuration.quiltBrowserslist!.run([]),
          //   ]);

          //   return [
          //     ...plugins,
          //     new ManifestPlugin({
          //       id: idFromTargetOptions(target.options),
          //       default: target.options.browsers === 'default',
          //       match: [
          //         {
          //           type: 'regex',
          //           key: 'userAgent',
          //           source: getUserAgentRegExp({
          //             browsers: browserslist,
          //             allowHigherVersions: true,
          //           }).source,
          //         },
          //       ],
          //     }),
          //   ];
          // });

          configuration.quiltBrowserslist?.hook(async () => {
            if (browserGroupMap.has(browsers)) {
              return browserGroupMap.get(browsers);
            }

            const {default: browserslist} = await import('browserslist');
            const browserslistResult = browserslist(undefined, {
              path: project.root,
              env: browsers,
            });

            browserGroupMap.set(browsers, browserslistResult);

            return browserslistResult;
          });

          if (babel) {
            configuration.babelConfig?.hook(
              updateSewingKitBabelPreset(
                async (options) => {
                  const target = await configuration.quiltBrowserslist!.run(
                    undefined,
                  );

                  return {...options, target};
                },
                {addIfMissing: false},
              ),
            );
          }

          if (postcss) {
            configuration.postcssPlugins?.hook(
              updatePostcssEnvPreset(
                async (options) => {
                  const browsers = await configuration.quiltBrowserslist!.run(
                    undefined,
                  );

                  return {...options, browsers};
                },
                {addIfMissing: false},
              ),
            );
          }
        });
      });
    });
  });
}
