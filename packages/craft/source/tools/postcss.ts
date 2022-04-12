import type {AcceptedPlugin as PostCSSPlugin, ProcessOptions} from 'postcss';
import type {Result as PostCSSConfigResult} from 'postcss-load-config';
import type {pluginOptions as PostCSSPresetEnvPluginOptions} from 'postcss-preset-env';

import {createProjectPlugin} from '../kit';
import type {WaterfallHook, WaterfallHookWithDefault, App} from '../kit';

import type {} from './rollup';

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
   */
  postcssPresetEnvOptions: WaterfallHook<PostCSSPresetEnvPluginOptions>;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends PostCSSHooks {}
  interface DevelopAppConfigurationHooks extends PostCSSHooks {}
}

/**
 * Adds hooks that allow you to customize PostCSS.
 */
export function postcss() {
  const configurationCache = new Map<App, Promise<PostCSSConfigResult>>();

  return createProjectPlugin<App>({
    name: 'SewingKit.Babel',
    build({hooks, project}) {
      hooks<PostCSSHooks>(({waterfall}) => ({
        postcssPlugins: waterfall({
          default: async () => (await loadPostCSSConfig(project)).plugins,
        }),
        postcssProcessOptions: waterfall({
          default: async () => (await loadPostCSSConfig(project)).options,
        }),
        postcssPresetEnvOptions: waterfall(),
      }));
    },
    develop({hooks, project}) {
      hooks<PostCSSHooks>(({waterfall}) => ({
        postcssPlugins: waterfall({
          default: async () => (await loadPostCSSConfig(project)).plugins,
        }),
        postcssProcessOptions: waterfall({
          default: async () => (await loadPostCSSConfig(project)).options,
        }),
        postcssPresetEnvOptions: waterfall(),
      }));
    },
  });

  async function loadPostCSSConfig(
    project: App,
  ): Promise<
    Omit<PostCSSConfigResult, 'plugins'> & {plugins: PostCSSPlugin[]}
  > {
    if (configurationCache.has(project)) {
      return configurationCache.get(project)!;
    }

    const {default: loadPostCSSConfig} = await import('postcss-load-config');

    const promise = loadPostCSSConfig({}, project.fs.root);

    configurationCache.set(project, promise);

    return promise;
  }
}
