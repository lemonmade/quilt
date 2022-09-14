import type {AcceptedPlugin as PostCSSPlugin, ProcessOptions} from 'postcss';
import type {Result as PostCSSConfigResult} from 'postcss-load-config';
import type {pluginOptions as PostCSSPresetEnvPluginOptions} from 'postcss-preset-env';
import type PostcssModulesPlugin from 'postcss-modules';

import {createProjectPlugin} from '../kit';
import type {Project, WaterfallHook, WaterfallHookWithDefault} from '../kit';

import type {} from './rollup';

export type PostCSSModulesOptions = Parameters<PostcssModulesPlugin>[0];

export interface PostCSSHooks {
  /**
   * PostCSS plugins to run when processing CSS.
   */
  postcssPlugins: WaterfallHookWithDefault<PostCSSPlugin[]>;

  /**
   * Options to use when processing a CSS files with PostCSS.
   */
  postcssProcessOptions: WaterfallHookWithDefault<ProcessOptions>;

  /**
   * Options to use for the `postcss-preset-env` PostCSS plugin.
   * @see https://github.com/csstools/postcss-plugins/tree/main/plugin-packs/postcss-preset-env
   * @see https://preset-env.cssdb.org/features
   */
  postcssPresetEnvOptions: WaterfallHook<PostCSSPresetEnvPluginOptions>;

  /**
   * Options to use for the `postcss-modules` PostCSS plugin.
   * @see https://github.com/madyankin/postcss-modules
   */
  postcssCSSModulesOptions: WaterfallHook<PostCSSModulesOptions>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends PostCSSHooks {}
  interface DevelopProjectConfigurationHooks extends PostCSSHooks {}
}

/**
 * Adds hooks that allow you to customize PostCSS.
 */
export function postcss() {
  const configurationCache = new Map<
    Project,
    Promise<PostCSSConfigResult | undefined>
  >();

  return createProjectPlugin({
    name: 'Quilt.PostCSS',
    build({hooks, project}) {
      hooks<PostCSSHooks>(({waterfall}) => ({
        postcssPlugins: waterfall({
          default: async () =>
            (await loadPostCSSConfig(project))?.plugins ?? [],
        }),
        postcssProcessOptions: waterfall({
          default: async () =>
            (await loadPostCSSConfig(project))?.options ?? {},
        }),
        postcssPresetEnvOptions: waterfall(),
        postcssCSSModulesOptions: waterfall(),
      }));
    },
    develop({hooks, project}) {
      hooks<PostCSSHooks>(({waterfall}) => ({
        postcssPlugins: waterfall({
          default: async () =>
            (await loadPostCSSConfig(project))?.plugins ?? [],
        }),
        postcssProcessOptions: waterfall({
          default: async () =>
            (await loadPostCSSConfig(project))?.options ?? {},
        }),
        postcssPresetEnvOptions: waterfall(),
        postcssCSSModulesOptions: waterfall(),
      }));
    },
  });

  async function loadPostCSSConfig(
    project: Project,
  ): Promise<
    | (Omit<PostCSSConfigResult, 'plugins'> & {plugins: PostCSSPlugin[]})
    | undefined
  > {
    if (configurationCache.has(project)) {
      return configurationCache.get(project)!;
    }

    const promise = (async () => {
      const {default: loadPostCSSConfig} = await import('postcss-load-config');

      try {
        const config = await loadPostCSSConfig({}, project.fs.root);
        return config;
      } catch {
        // intentional noop
      }
    })();

    configurationCache.set(project, promise);

    return promise;
  }
}
