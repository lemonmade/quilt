import type {InlineConfig, PluginOption} from 'vite';

import {App, createProjectPlugin} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';

export interface ViteHooks {
  /**
   * The port to run vite’s development server on.
   */
  vitePort: WaterfallHook<number | undefined>;

  /**
   * Module aliases to use for the vite `resolve` configuration.
   */
  viteResolveAliases: WaterfallHook<Record<string, string>>;

  /**
   * Export conditions to use for the vite `resolve` configuration.
   */
  viteResolveExportConditions: WaterfallHook<string[]>;

  /**
   * Extensions to use for the the vite `resolve` configuration.
   */
  viteResolveExtensions: WaterfallHook<string[]>;

  /**
   * Plugins to include in vite’s configuration.
   */
  vitePlugins: WaterfallHook<PluginOption[]>;

  /**
   * Customizations on the full vite configuration. The resulting
   * configuration is typically passed to vite’s `createServer`.
   */
  viteConfig: WaterfallHook<InlineConfig>;
}

declare module '@quilted/sewing-kit' {
  interface DevelopAppConfigurationHooks extends ViteHooks {}
}

/**
 * Runs vite during development for this application.
 */
export function vite() {
  return createProjectPlugin<App>({
    name: 'SewingKit.Vite',
    develop({project, internal, hooks, run}) {
      hooks<ViteHooks>(({waterfall}) => ({
        viteConfig: waterfall(),
        vitePlugins: waterfall(),
        vitePort: waterfall(),
        viteResolveAliases: waterfall(),
        viteResolveExportConditions: waterfall(),
        viteResolveExtensions: waterfall(),
      }));

      run((step, {configuration}) =>
        step({
          name: 'SewingKit.Vite',
          label: `Running vite for ${project.name}`,
          async run() {
            const [
              {createServer},
              {
                extensions,
                viteConfig,
                vitePlugins,
                vitePort,
                viteResolveAliases,
                viteResolveExportConditions,
                viteResolveExtensions,
              },
            ] = await Promise.all([import('vite'), configuration()]);

            const baseExtensions = await extensions.run([
              '.mjs',
              '.js',
              '.ts',
              '.jsx',
              '.tsx',
              '.json',
            ]);

            const [
              plugins,
              port,
              aliases,
              exportConditions,
              resolveExtensions,
            ] = await Promise.all([
              vitePlugins!.run([]),
              vitePort!.run(undefined),
              viteResolveAliases!.run({}),
              // @see https://vitejs.dev/config/#resolve-conditions
              viteResolveExportConditions!.run([
                'import',
                'module',
                'browser',
                'default',
                'development',
              ]),
              // @see https://vitejs.dev/config/#resolve-extensions
              viteResolveExtensions!.run(baseExtensions),
            ]);

            const config = await viteConfig!.run({
              configFile: false,
              clearScreen: false,
              cacheDir: internal.fs.tempPath('vite/cache'),
              server: {port},
              resolve: {
                extensions: resolveExtensions,
                alias: aliases,
                conditions: exportConditions,
              },
              plugins,
              esbuild: {
                jsxInject: `import React from 'react'`,
              },
            });

            const server = await createServer(config);
            await server.listen();
          },
        }),
      );
    },
  });
}
