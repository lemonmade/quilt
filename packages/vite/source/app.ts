import type {Plugin} from 'vite';
import {MAGIC_MODULE_BROWSER_ASSETS} from '@quilted/rollup/app';

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
}

export async function quiltApp({
  graphql: useGraphQL = true,
}: AppBaseOptions = {}) {
  const [
    {default: prefresh},
    {graphql},
    {tsconfigAliases},
    {monorepoPackageAliases},
  ] = await Promise.all([
    // @ts-expect-error This package is not set up correctly for ESM projects
    // @see https://github.com/preactjs/prefresh/issues/518
    import('@prefresh/vite'),
    import('@quilted/rollup/features/graphql'),
    import('@quilted/rollup/features/typescript'),
    import('@quilted/rollup/features/node'),
  ]);

  const plugins: Plugin[] = [
    prefresh(),
    {...(await tsconfigAliases()), enforce: 'pre'},
    {...(await monorepoPackageAliases()), enforce: 'pre'},
    magicModuleAppAssetManifest(),
  ];

  if (useGraphQL) {
    // @ts-expect-error different versions of rollup
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
                vite.ssrLoadModule('/server.tsx'),
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

export function magicModuleAppAssetManifest() {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/asset-manifests',
    module: MAGIC_MODULE_BROWSER_ASSETS,
    source() {
      const manifest = {
        attributes: {
          scripts: {type: 'module'},
        },
        assets: [`/@vite/client`, `/browser.tsx`],
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
