import type {PluginItem} from '@babel/core';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

export interface BabelHooks {
  /**
   * Babel plugins to use for this project.
   */
  babelPlugins: WaterfallHook<PluginItem[]>;

  /**
   * Babel presets to use for this project.
   */
  babelPresets: WaterfallHook<PluginItem[]>;

  /**
   * Babel presets to use for this project.
   */
  babelExtensions: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends BabelHooks {}
  interface DevelopProjectConfigurationHooks extends BabelHooks {}
  interface TestProjectConfigurationHooks extends BabelHooks {}
}

/**
 * Adds basic Babel hooks that other plugins can attach configuration to.
 */
export function babelHooks() {
  return createProjectPlugin({
    name: 'SewingKit.Babel',
    build({hooks}) {
      hooks<BabelHooks>(({waterfall}) => ({
        babelPlugins: waterfall(),
        babelPresets: waterfall(),
        babelExtensions: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<BabelHooks>(({waterfall}) => ({
        babelPlugins: waterfall(),
        babelPresets: waterfall(),
        babelExtensions: waterfall(),
      }));
    },
    test({hooks}) {
      hooks<BabelHooks>(({waterfall}) => ({
        babelPlugins: waterfall(),
        babelPresets: waterfall(),
        babelExtensions: waterfall(),
      }));
    },
  });
}
