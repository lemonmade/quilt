import {createWorkspacePlugin} from '@quilted/sewing-kit';

export interface ESLintHooks {}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends ESLintHooks {}
  interface DevelopProjectConfigurationHooks extends ESLintHooks {}
}

/**
 * Runs ESLint on your workspace.
 */
export function eslint() {
  return createWorkspacePlugin({
    name: 'SewingKit.ESLint',
    // build({hooks}) {
    //   hooks<BabelHooks>(({waterfall}) => ({
    //     babelPlugins: waterfall(),
    //     babelPresets: waterfall(),
    //   }));
    // },
    // develop({hooks}) {
    //   hooks<BabelHooks>(({waterfall}) => ({
    //     babelPlugins: waterfall(),
    //     babelPresets: waterfall(),
    //   }));
    // },
  });
}
