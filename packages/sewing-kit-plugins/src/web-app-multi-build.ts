import {
  createProjectPlugin,
  WebApp,
  WaterfallHook,
  addHooks,
} from '@sewing-kit/plugins';
import type {BuildWebAppTargetOptions} from '@sewing-kit/hooks';
import {updateSewingKitBabelPreset} from '@sewing-kit/plugin-javascript';
import {updatePostcssEnvPreset} from '@sewing-kit/plugin-css';

import {} from '@sewing-kit/plugin-webpack';

interface CustomHooks {
  readonly quiltBrowserslist: WaterfallHook<string | string[] | undefined>;
}

interface CustomOptions {
  readonly quiltBrowserGroup?: string;
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
  'safari >= 11',
  'ios >= 11',
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

  return createProjectPlugin<WebApp>(PLUGIN, ({project, tasks}) => {
    tasks.build.hook(({hooks}) => {
      hooks.targets.hook((targets) =>
        targets.map((target) =>
          target.default
            ? target.multiply((currentTarget) =>
                Object.keys(browserGroups).map((browsers) => ({
                  ...currentTarget,
                  quiltBrowserGroup: browsers as BuildWebAppTargetOptions['quiltBrowserGroup'],
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
        hooks.configure.hook((configuration) => {
          const {quiltBrowserGroup} = target.options;

          if (quiltBrowserGroup == null) return;

          configuration.quiltBrowserslist?.hook(async () => {
            if (browserGroupMap.has(quiltBrowserGroup)) {
              return browserGroupMap.get(quiltBrowserGroup);
            }

            const {default: browserslist} = await import('browserslist');
            const browserslistResult = browserslist(undefined, {
              path: project.root,
              env: quiltBrowserGroup,
            });

            browserGroupMap.set(quiltBrowserGroup, browserslistResult);

            return browserslistResult;
          });

          if (babel) {
            configuration.babelConfig?.hook(
              updateSewingKitBabelPreset(
                async () => {
                  const target = await configuration.quiltBrowserslist!.run(
                    undefined,
                  );

                  return {target};
                },
                {addIfMissing: false},
              ),
            );
          }

          if (postcss) {
            configuration.postcssPlugins?.hook(
              updatePostcssEnvPreset(
                async () => {
                  const browsers = await configuration.quiltBrowserslist!.run(
                    undefined,
                  );
                  return {browsers};
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
