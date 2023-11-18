import * as path from 'path';

import type {Plugin} from 'vite';
import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
  type AppBrowserOptions,
  type AppServerOptions,
} from '@quilted/rollup/app';
import type {MagicModuleEnvOptions} from '@quilted/rollup/features/env';

import {multiline} from './shared/strings.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';

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
}

export interface AppOptions extends AppBaseOptions {
  /**
   * Customizes the browser build of your application.
   */
  browser?: Pick<AppBrowserOptions, 'module' | 'entry'>;

  /**
   * Customizes the server build of your application.
   */
  server?: Pick<AppServerOptions, 'format' | 'entry'>;
}

export async function quiltApp({
  app,
  env,
  browser,
  server,
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
    {tsconfigAliases},
    {monorepoPackageAliases},
    {magicModuleEnv},
    {workers},
    {babelPreprocess},
  ] = await Promise.all([
    import('@prefresh/vite'),
    import('@quilted/rollup/app'),
    import('@quilted/rollup/features/graphql'),
    import('@quilted/rollup/features/typescript'),
    import('@quilted/rollup/features/node'),
    import('@quilted/rollup/features/env'),
    import('@quilted/rollup/features/workers'),
    import('./shared/babel.ts'),
  ]);

  const plugins: Plugin[] = [
    prefresh(),
    {
      ...(await tsconfigAliases()),
      enforce: 'pre',
      name: '@quilted/tsconfig-aliases',
    },
    {...(await monorepoPackageAliases()), enforce: 'pre'},
    {
      ...magicModuleEnv({mode, ...(typeof env === 'object' ? env : {})}),
      enforce: 'pre',
    },
    {...magicModuleAppComponent({entry: app}), enforce: 'pre'},
    {...magicModuleAppBrowserEntry(browser?.module), enforce: 'pre'},
    magicModuleAppAssetManifest({entry: browser?.entry}),
    babelPreprocess(),
    workers(),
  ];

  if (server?.format !== 'custom') {
    plugins.push({
      ...magicModuleAppRequestRouter({entry: server?.entry}),
      enforce: 'pre',
    });
  }

  if (useGraphQL) {
    plugins.push(graphql());
  }

  plugins.push({
    name: '@quilted/overrides',
    config() {
      return {
        appType: 'custom',
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'preact',
        },
        optimizeDeps: {
          // The default app templates don’t import Preact, but it is used as an alias
          // for React. Without explicitly listing it here, two different versions would
          // be created — one inlined into the React optimized dependency, and one as the
          // raw preact node module.
          include: ['preact'],
        },
        resolve: {
          dedupe: ['preact'],
          alias: [
            {find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime'},
            {find: 'react/jsx-dev-runtime', replacement: 'preact/jsx-runtime'},
            {find: 'react', replacement: 'preact/compat'},
            {find: 'react-dom', replacement: 'preact/compat'},
            {
              find: /^@quilted[/]react-testing$/,
              replacement: '@quilted/react-testing/preact',
            },
            {
              find: /^@quilted[/]react-testing[/]dom$/,
              replacement: '@quilted/react-testing/preact',
            },
          ],
        },
      };
    },
  });

  plugins.push({
    name: '@quilted/development-server',
    configureServer(vite) {
      return () => {
        vite.middlewares.use(async (req, res, next) => {
          try {
            const [{default: requestRouter}, {createHttpRequestListener}] =
              await Promise.all([
                vite.ssrLoadModule(MAGIC_MODULE_REQUEST_ROUTER),
                import('@quilted/request-router/node'),
              ]);

            const handle = createHttpRequestListener(requestRouter);
            await handle(req, res);
          } catch (error) {
            next(error);
          }
        });
      };
    },
  });

  return plugins;
}

export function magicModuleAppAssetManifest({entry}: {entry?: string} = {}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/asset-manifests',
    module: MAGIC_MODULE_BROWSER_ASSETS,
    async source() {
      const {sourceEntryForAppBrowser} = await import('@quilted/rollup/app');

      const sourceEntry = await sourceEntryForAppBrowser({entry});
      let entryIdentifier: string;

      if (sourceEntry) {
        const relativeSourceEntry = path.relative(process.cwd(), sourceEntry);
        entryIdentifier = relativeSourceEntry.startsWith(`..${path.sep}`)
          ? `/@fs${sourceEntry}`
          : relativeSourceEntry.startsWith(`.${path.sep}`)
          ? `/${relativeSourceEntry.slice(2)}`
          : `/${relativeSourceEntry}`;
      } else {
        entryIdentifier = `/@id/${MAGIC_MODULE_ENTRY}`;
      }

      const manifest = {
        attributes: {
          scripts: {type: 'module'},
        },
        assets: [`/@vite/client`, entryIdentifier],
        entries: {
          default: {
            scripts: [0, 1],
            styles: [],
          },
        },
      };

      return multiline`
        import {BrowserAssetsFromManifests} from '@quilted/quilt/server';

        const MANIFEST = ${JSON.stringify(manifest)};
        MANIFEST.modules = new Proxy(
          {},
          {
            get(_, key) {
              if (typeof key !== 'string') {
                return undefined;
              }

              let index = MANIFEST.assets.indexOf(key);

              if (index < 0) {
                MANIFEST.assets.push(key);
                index = MANIFEST.assets.length - 1;
              }

              return {
                scripts: [index],
                styles: [],
              };
            },
          },
        );

        export class BrowserAssets extends BrowserAssetsFromManifests {
          constructor() {
            super([], {
              defaultManifest: MANIFEST,
            });
          }
        }
      `;
    },
  });
}
