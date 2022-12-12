import type {
  InlineConfig,
  PluginOption,
  ServerOptions as ViteServerOptions,
} from 'vite';
import type {InputOptions} from 'rollup';

import {createProjectPlugin} from '../kit';
import type {
  Project,
  WaterfallHook,
  ResolvedDevelopProjectConfigurationHooks,
} from '../kit';

import type {} from './rollup';

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
   * Dependencies to pre-bundle when starting the development server.
   */
  viteOptimizeDepsInclude: WaterfallHook<string[]>;

  /**
   * Dependencies to exclude from pre-bundle when starting the development server.
   */
  viteOptimizeDepsExclude: WaterfallHook<string[]>;

  /**
   * Options to provide to Vite’s `build.rollupOptions` option, to customize
   * the underlying Rollup build.
   */
  viteRollupOptions: WaterfallHook<InputOptions>;

  /**
   * The list of IDs (or regular expressions) marking modules that
   * should not be treated as external for the server development build.
   */
  viteSsrNoExternals: WaterfallHook<(string | RegExp)[]>;

  /**
   * The list of IDs (or regular expressions) marking modules that
   * should always treated as external for the server development build.
   */
  viteSsrExternals: WaterfallHook<string[]>;

  /**
   * Customize vite’s server configuration configuration. The resulting
   * configuration is typically passed to as vite’s `options.server`.
   */
  viteServerOptions: WaterfallHook<ViteServerOptions>;

  /**
   * Customizations on the full vite configuration. The resulting
   * configuration is typically passed to vite’s `createServer`.
   */
  viteConfig: WaterfallHook<InlineConfig>;
}

declare module '@quilted/sewing-kit' {
  interface DevelopProjectConfigurationHooks extends ViteHooks {}
}

/**
 * Runs vite during development for this application.
 */
export function vite({run: shouldRun = true} = {}) {
  return createProjectPlugin({
    name: 'Quilt.Vite',
    develop({project, hooks, run}) {
      hooks<ViteHooks>(({waterfall}) => ({
        viteConfig: waterfall(),
        viteHost: waterfall(),
        viteOptimizeDepsExclude: waterfall(),
        viteOptimizeDepsInclude: waterfall(),
        vitePlugins: waterfall(),
        vitePort: waterfall(),
        viteResolveAliases: waterfall(),
        viteResolveExportConditions: waterfall(),
        viteResolveExtensions: waterfall(),
        viteRollupOptions: waterfall(),
        viteSsrNoExternals: waterfall(),
        viteSsrExternals: waterfall(),
        viteServerOptions: waterfall(),
      }));

      if (!shouldRun) return;

      run((step, {configuration}) =>
        step({
          name: 'Quilt.Vite',
          label: `Running vite for ${project.name}`,
          async run(runner) {
            const [{createServer}, configurationHooks] = await Promise.all([
              import('vite'),
              configuration(),
            ]);

            const config = await createViteConfig(project, configurationHooks);

            const server = await createServer(config);
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

export async function createViteConfig(
  project: Project,
  {
    extensions,
    viteConfig,
    viteHost,
    viteOptimizeDepsExclude,
    viteOptimizeDepsInclude,
    vitePlugins,
    vitePort,
    viteResolveAliases,
    viteResolveExportConditions,
    viteResolveExtensions,
    viteRollupOptions,
    viteSsrNoExternals,
    viteSsrExternals,
    viteServerOptions,
    postcssPlugins,
    postcssProcessOptions,
    postcssCSSModulesOptions,
  }: ResolvedDevelopProjectConfigurationHooks,
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
    optimizeDepsExclude,
    optimizeDepsInclude,
    aliases,
    exportConditions,
    resolveExtensions,
    rollupOptions,
    noExternals,
    externals,
    cssModulesOptions,
    cssPlugins,
    cssProcessOptions,
  ] = await Promise.all([
    vitePlugins!.run([]),
    vitePort!.run(undefined),
    viteHost!.run(undefined),
    viteOptimizeDepsExclude!.run([]),
    viteOptimizeDepsInclude!.run([]),
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
    viteRollupOptions!.run({}),
    viteSsrNoExternals!.run([]),
    viteSsrExternals!.run([]),
    postcssCSSModulesOptions!.run({}),
    postcssPlugins!.run(),
    postcssProcessOptions!.run(),
  ]);

  const serverOptions = await viteServerOptions!.run({
    port,
    host,
    watch: {
      ignored: [
        project.fs.temporaryPath('vite/cache'),
        project.fs.temporaryPath('develop'),
      ],
    },
  });

  const config = await viteConfig!.run({
    root: project.root,
    configFile: false,
    clearScreen: false,
    cacheDir: project.fs.temporaryPath('vite/cache'),
    build: {
      rollupOptions,
    },
    server: serverOptions,
    ssr: {external: externals, noExternal: noExternals},
    resolve: {
      alias: aliases,
      extensions: resolveExtensions,
      conditions: exportConditions,
    },
    optimizeDeps: {
      include: optimizeDepsInclude,
      exclude: optimizeDepsExclude,
    },
    css: {
      modules: cssModulesOptions as any,
      postcss: {
        ...cssProcessOptions,
        plugins: cssPlugins as any,
      },
    },
    plugins,
  });

  return config;
}
