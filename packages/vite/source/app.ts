import * as path from 'path';

import type {Plugin} from 'vite';
import {
  sourceEntryForAppBrowser,
  additionalEntriesForAppBrowser,
  sourceEntryForAppServer,
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
  type AppBrowserOptions,
  type AppServerOptions,
} from '@quilted/rollup/app';
import type {MagicModuleEnvOptions} from '@quilted/rollup/features/env';

import {multiline} from './shared/strings.ts';
import {react} from './shared/react.ts';
import {monorepoPackageAliases} from './shared/node.ts';
import {tsconfigAliases} from './shared/typescript.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';
import {fileURLToPath} from 'url';

export interface AppBaseOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * The entry module for this app. This should be an absolute path, or relative
   * path from the root directory containing your project. This entry should just be
   * for the main `App` component in your project, which Quilt will automatically use
   * to create browser and server-side entries for your project.
   *
   * If you only want to use a custom entry module for the browser build, use the
   * `entry` option of the `quiltAppBrowser()` instead. If you only want to use a
   * custom entry module for the server-side build, use the `server.entry` option
   * instead.
   *
   * @example './App.tsx'
   */
  app?: string;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;

  /**
   * Customizes the behavior of environment variables for your application. You
   * can further customize the environment variables provided to browser assets
   * by passing the `browser.env`, and those passed during server-side rendering
   * by passing `server.env`.
   */
  env?: MagicModuleEnvOptions | MagicModuleEnvOptions['mode'];

  /**
   * Controls how React will be handled by your package. Setting this value
   * to `preact` will cause Quilt to use `preact` as the JSX import source.
   * Otherwise, `react` will be used as the import source.
   *
   * @default true
   */
  react?: boolean | 'react' | 'preact';
}

export interface AppOptions extends AppBaseOptions {
  /**
   * Customizes the browser build of your application.
   */
  browser?: Pick<AppBrowserOptions, 'module' | 'entry' | 'entries' | 'env'>;

  /**
   * Customizes the server build of your application.
   */
  server?: Pick<AppServerOptions, 'format' | 'entry' | 'env'>;
}

export async function quiltApp({
  root,
  app,
  env,
  browser,
  server,
  react: useReact = true,
  graphql: useGraphQL = true,
}: AppOptions = {}) {
  const mode = typeof env === 'string' ? env : env?.mode ?? 'development';

  const [
    {default: prefresh},
    {
      magicModuleAppComponent,
      magicModuleAppBrowserEntry,
      magicModuleAppRequestRouter,
    },
    {graphql},
    {magicModuleEnv},
    {asyncModules},
    {babelPreprocess},
    {workers},
  ] = await Promise.all([
    import('@prefresh/vite'),
    import('@quilted/rollup/app'),
    import('@quilted/rollup/features/graphql'),
    import('@quilted/rollup/features/env'),
    import('@quilted/rollup/features/async'),
    import('./shared/babel.ts'),
    import('./shared/workers.ts'),
  ]);

  const plugins: Plugin[] = [
    prefresh(),
    babelPreprocess(),
    tsconfigAliases(),
    monorepoPackageAliases(),
    {...magicModuleAppComponent({root, entry: app}), enforce: 'pre'},
    {...magicModuleAppBrowserEntry(browser?.module), enforce: 'pre'},
    magicModuleAppAssetManifest({root, entry: browser?.entry}),
    workers(),
    asyncModules({
      preload: true,
      moduleID({imported}) {
        const relative = path.relative(process.cwd(), imported);
        return relative.startsWith('..')
          ? `/@id/quilt-async-module:${imported}`
          : `/@id/quilt-async-module:/${relative}`;
      },
    }),
  ];

  const defaultEnvOptions = typeof env === 'object' ? env : undefined;
  if (browser?.env || server?.env) {
    const serverPlugin = magicModuleEnv({
      mode,
      ...defaultEnvOptions,
      ...(typeof server?.env === 'object' ? server.env : {}),
    });

    const browserPlugin = magicModuleEnv({
      mode,
      ...defaultEnvOptions,
      ...(typeof browser?.env === 'object' ? browser.env : {}),
    });

    plugins.push(
      restrictPluginToSSR({...serverPlugin, enforce: 'pre'}, {ssr: true}),
      restrictPluginToSSR({...browserPlugin, enforce: 'pre'}, {ssr: false}),
    );
  } else {
    plugins.push({
      ...magicModuleEnv({mode, ...defaultEnvOptions}),
      enforce: 'pre',
    });
  }

  if (server?.format !== 'custom') {
    plugins.push({
      ...magicModuleAppRequestRouter({entry: server?.entry}),
      enforce: 'pre',
    });

    plugins.push({
      name: '@quilted/development-server',
      enforce: 'pre',
      configureServer(vite) {
        return () => {
          vite.middlewares.use(async (req, res, next) => {
            try {
              const [serverEntry, {createHttpRequestListener}] =
                await Promise.all([
                  sourceEntryForAppServer({entry: server?.entry}),
                  import('@quilted/request-router/node'),
                ]);

              // There seems to be a bug with using the the virtual module where Vite
              // does not perform HMR on the server. We use the actual file on disk if
              // possible instead, which does HMR correctly.
              const {default: requestRouter} = await vite.ssrLoadModule(
                serverEntry ?? MAGIC_MODULE_REQUEST_ROUTER,
              );

              const handle = createHttpRequestListener(requestRouter);
              await handle(req, res);
            } catch (error) {
              next(error);
            }
          });
        };
      },
    });
  }

  if (useGraphQL) {
    plugins.push(graphql());
  }

  if (useReact) {
    plugins.push(
      react({package: typeof useReact === 'string' ? useReact : 'preact'}),
    );
  }

  plugins.push({
    name: '@quilted/overrides',
    config() {
      return {
        appType: 'custom',
        test: {
          environment: 'jsdom',
        },
        build: {
          rollupOptions: {
            input: {},
          },
        },
      };
    },
  });

  return plugins;
}

export function magicModuleAppAssetManifest({
  root = process.cwd(),
  entry,
}: {entry?: string; root?: string | URL} = {}) {
  const rootPath = root instanceof URL ? fileURLToPath(root) : root;

  return createMagicModulePlugin({
    name: '@quilted/magic-module/asset-manifests',
    module: MAGIC_MODULE_BROWSER_ASSETS,
    async source() {
      const sourceEntry = await sourceEntryForAppBrowser({root, entry});
      const additionalEntries = await additionalEntriesForAppBrowser({root});

      const entries: Record<string, string> = {
        ...additionalEntries,
        ['.']: sourceEntry ?? `/@id/${MAGIC_MODULE_ENTRY}`,
      };

      const normalizedEntries: Record<string, string> = {};

      for (const [entry, module] of Object.entries(entries)) {
        const entryName = entry.startsWith('.') ? entry : `./${entry}`;

        if (module.startsWith('/@')) {
          normalizedEntries[entryName] = module;
          continue;
        }

        const relativeSourceEntry = path.relative(rootPath, module);
        const normalizedModule = relativeSourceEntry.startsWith(`..${path.sep}`)
          ? `/@fs${sourceEntry}`
          : relativeSourceEntry.startsWith(`.${path.sep}`)
            ? `/${relativeSourceEntry.slice(2)}`
            : `/${relativeSourceEntry}`;

        normalizedEntries[entryName] = normalizedModule;
      }

      return multiline`
        const entries = ${JSON.stringify(normalizedEntries)}; 

        export class BrowserAssets {
          entry({id = '.', modules} = {}) {
            const normalizedEntry = id.startsWith('.') ? id : id.startsWith('/') ? ('.' + id) : ('./' + id);
            const entryModule = entries[normalizedEntry];

            if (entryModule == null) {
              return {styles: [], scripts: []};
            }

            const scripts = [
              {source: '/@vite/client', attributes: {type: 'module'}},
              {source: entryModule, attributes: {type: 'module'}},
            ];

            if (modules) {
              scripts.push(...this.modules(modules).scripts);
            }

            return {styles: [], scripts};
          }

          modules(ids, _options) {
            const scripts = [];

            for (const idOrSelector of ids) {
              const includeScripts = idOrSelector.scripts ?? true;
              if (!includeScripts) continue;

              const id = normalizeID(idOrSelector.id ?? idOrSelector);
              scripts.push({source: id, attributes: {type: 'module'}});
            }

            return {styles: [], scripts};
          }
        }

        function normalizeID(id) {
          return id.startsWith('/') ? id : id.startsWith('./') ? ('/' + id.slice(2)) : ('/' + id);
        }
      `;
    },
  });
}

function restrictPluginToSSR(plugin: Plugin, {ssr}: {ssr: boolean}): Plugin {
  const hooks = ['resolveId', 'load', 'transform'] as const;

  for (const hook of hooks) {
    const originalHook = (plugin as any)[hook];

    if (originalHook == null) continue;

    (plugin as any)[hook] = function (this: any, ...args: any[]) {
      const isSSR = args.at(-1)?.ssr ?? false;
      if ((ssr && !isSSR) || (!ssr && isSSR)) return;
      return originalHook.call(this, ...args);
    } satisfies Plugin[typeof hook];
  }

  return plugin;
}
