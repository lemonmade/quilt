import type {InlineConfig, ServerOptions, PluginOption} from 'vite';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  App,
  WaterfallHook,
  SewingKitInternalContext,
  ResolvedDevelopProjectConfigurationHooks,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';

export interface ViteHooks {
  /**
   * The port to run vite’s development server on.
   */
  vitePort: WaterfallHook<number | undefined>;

  /**
   * The host to run vite’s development server on.
   */
  viteHost: WaterfallHook<string | undefined>;

  /**
   * The middleware mode to use for Vite’s development server.
   */
  viteMiddlewareMode: WaterfallHook<ServerOptions['middlewareMode']>;

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
   * The list of IDs (or regular expressions) marking modules that
   * should not be treated for the server development build.
   */
  viteSsrNoExternals: WaterfallHook<(string | RegExp)[]>;

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
export function vite({run: shouldRun = true} = {}) {
  return createProjectPlugin<App>({
    name: 'SewingKit.Vite',
    develop({project, internal, hooks, run}) {
      hooks<ViteHooks>(({waterfall}) => ({
        viteConfig: waterfall(),
        vitePlugins: waterfall(),
        vitePort: waterfall(),
        viteHost: waterfall(),
        viteMiddlewareMode: waterfall(),
        viteResolveAliases: waterfall(),
        viteResolveExportConditions: waterfall(),
        viteSsrNoExternals: waterfall(),
        viteResolveExtensions: waterfall(),
      }));

      if (!shouldRun) return;

      run((step, {configuration}) =>
        step({
          name: 'SewingKit.Vite',
          label: `Running vite for ${project.name}`,
          async run(runner) {
            const server = await getViteServer(
              {internal},
              await configuration(),
            );

            await server.listen();

            const serverAddress = server.httpServer?.address();

            if (typeof serverAddress === 'object' && serverAddress != null) {
              runner.log(
                (ui) =>
                  `Started ${ui.Link('vite development server', {
                    to: `http://localhost:${serverAddress.port}`,
                  })}`,
              );
            }
          },
        }),
      );
    },
  });
}

export async function getViteServer(
  {internal}: {internal: SewingKitInternalContext},
  configurationHooks: ResolvedDevelopProjectConfigurationHooks<App>,
) {
  const [{createServer}, configuration] = await Promise.all([
    import('vite'),
    getViteConfiguration({internal}, configurationHooks),
  ]);

  const server = await createServer(configuration);

  return server;
}

export async function getViteConfiguration(
  {internal}: {internal: SewingKitInternalContext},
  {
    extensions,
    viteConfig,
    vitePlugins,
    vitePort,
    viteHost,
    viteMiddlewareMode,
    viteResolveAliases,
    viteResolveExportConditions,
    viteSsrNoExternals,
    viteResolveExtensions,
  }: ResolvedDevelopProjectConfigurationHooks<App>,
) {
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
    host,
    middlewareMode,
    aliases,
    exportConditions,
    resolveExtensions,
    noExternals,
  ] = await Promise.all([
    vitePlugins!.run([]),
    vitePort!.run(undefined),
    viteHost!.run(undefined),
    viteMiddlewareMode!.run(undefined),
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
    viteSsrNoExternals!.run([]),
  ]);

  const config = await viteConfig!.run({
    configFile: false,
    clearScreen: false,
    cacheDir: internal.fs.tempPath('vite/cache'),
    server: {port, host, middlewareMode},
    // @ts-expect-error The types do not have this field, but it
    // is supported.
    ssr: {noExternal: noExternals},
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

  return config;
}
