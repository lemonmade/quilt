/* eslint @typescript-eslint/no-empty-interface: off */

import {
  Runtime,
  createProjectPlugin,
  createWorkspacePlugin,
  createApp,
  createPackage,
  createService,
  createWorkspace,
} from '@quilted/sewing-kit';
import type {App, Service, Package, Project} from '@quilted/sewing-kit';

import {
  babelHooks,
  babelWorkspaceHooks,
  babelRollup,
} from '@quilted/sewing-kit-babel';
import {packageBuild} from '@quilted/sewing-kit-package';
import type {Options as PackageBuildOptions} from '@quilted/sewing-kit-package';
import {rollupHooks, rollupNode} from '@quilted/sewing-kit-rollup';
import type {RollupNodeOptions} from '@quilted/sewing-kit-rollup';
import {eslint} from '@quilted/sewing-kit-eslint';
import {prettier} from '@quilted/sewing-kit-prettier';
import {esnextBuild, esnext} from '@quilted/sewing-kit-esnext';
import {react} from '@quilted/sewing-kit-react';
import {targets, workspaceTargets} from '@quilted/sewing-kit-targets';
import {jest} from '@quilted/sewing-kit-jest';
import {vite} from '@quilted/sewing-kit-vite';
import {
  typescriptProject,
  typescriptWorkspace,
} from '@quilted/sewing-kit-typescript';

import type {Options as PolyfillOptions} from '@quilted/polyfills/sewing-kit';

import {aliasWorkspacePackages} from './plugins/alias-workspace-packages';
import {preact} from './plugins/preact';
import {appBuild} from './plugins/app-build';
import type {
  AssetOptions as AppBuildAssetOptions,
  AppBrowserOptions,
} from './plugins/app-build';
import {appDevelop} from './plugins/app-develop';
import type {Options as AppDevelopOptions} from './plugins/app-develop';
import {magicModuleApp} from './plugins/magic-module-app';
import {magicModuleBrowserEntry} from './plugins/magic-module-browser-entry';
import {magicModuleAppServerEntry} from './plugins/magic-module-app-server-entry';
import {magicModuleEnv} from './plugins/magic-module-env';
import type {EnvironmentOptions} from './plugins/magic-module-env';

import {appServer} from './plugins/app-server';
import type {AppServerOptions} from './plugins/app-server';

import {appStatic} from './plugins/app-static';
import type {AppStaticOptions} from './plugins/app-static';

import {appWorkers} from './plugins/app-workers';
import {serviceBuild} from './plugins/service-build';
import type {Options as ServiceBuildOptions} from './plugins/service-build';

import {httpHandler, httpHandlerDevelopment} from './plugins/http-handler';
import type {Options as HttpHandlerOptions} from './plugins/http-handler';

import {tsconfigAliases} from './plugins/tsconfig-aliases';

// Without these exports, TypeScript doesn’t see all the module augmentations
// added by these modules when you try to reference them from another package.
export type {} from './plugins/app-build';
export type {} from './plugins/app-auto-server';
export type {} from './plugins/browser-entry';
export type {} from './plugins/http-handler';

// Re-export for convenience in consumers, these allow them to
// create many plugins without having to grab types from the
// (significantly more complex) `@quilted/sewing-kit` package.
export {
  Runtime,
  createProjectPlugin,
  createWorkspacePlugin,
  createApp,
  createPackage,
  createService,
  createWorkspace,
};
export type {App, Service, Package, Project};

export * from './constants';

export interface AppOptions {
  polyfill?: boolean | PolyfillOptions;
  develop?: boolean | Pick<AppDevelopOptions, 'port'>;
  build?: boolean;

  /**
   * Customizes the assets created for your application.
   */
  assets?: Partial<AppBuildAssetOptions>;

  /**
   * Customizes the browser entrypoint of your application.
   */
  browser?: AppBrowserOptions;

  /**
   * Allows you to enable and customize a static build of this application.
   * By default, Quilt creates a server rendering output instead of static
   * assets; we believe server-side rendering is generally a better pattern,
   * as you can get a lot of the same benefits of static outputs by putting
   * a CDN in front of your server rendering application. However, many hosting
   * platforms have great support for static outputs, so Quilt supports this
   * pattern if explicitly requested. Note that, if you enable static rendering,
   * the auto-generated server is disabled by default, so you’ll need to
   * explicitly enable both if you want them.
   */
  static?: boolean | AppStaticOptions;

  /**
   * Customizes the server created for your application. By default,
   * Quilt will create an Node server (using ES modules), but you can
   * use any Sewing Kit plugin that can adapt an HTTP handler to a runtime
   * environment. If you want to disable the creation of the server
   * altogether, you can pass `server: false`.
   */
  server?: boolean | AppServerOptions;

  /**
   * Customizes the behavior of environment variables for your application. You
   * can further customize the environment variables provided during server-side
   * rendering by passing `server.env`.
   */
  env?: EnvironmentOptions;
}

export function quiltApp({
  env,
  polyfill: shouldPolyfill = true,
  develop = true,
  build = true,
  assets = {},
  browser = {},
  static: renderStatic = false,
  server = !renderStatic,
}: AppOptions = {}) {
  const {minify = true, baseUrl = '/assets/'} = assets;

  const useHttpHandler =
    typeof server === 'boolean' ? server : server.httpHandler ?? true;

  return createProjectPlugin<App>({
    name: 'Quilt.App',
    async create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        rollupNode(),
        babelHooks(),
        babelRollup(),
        targets(),
        typescriptProject(),
        tsconfigAliases(),
        esnext(),
        react(),
        preact(),
        aliasWorkspacePackages(),
        // Magic modules
        magicModuleApp(),
        magicModuleBrowserEntry({hydrate: Boolean(server)}),
        magicModuleAppServerEntry(),
        magicModuleEnv(),
        // Build and auto-server setup
        build &&
          appBuild({
            env,
            browser,
            server: Boolean(server),
            static: Boolean(renderStatic),
            assets: {minify, baseUrl},
          }),
        build &&
          renderStatic &&
          appStatic(
            typeof renderStatic === 'boolean' ? undefined : renderStatic,
          ),
        build && server && useHttpHandler && httpHandler(),
        build &&
          server &&
          appServer(typeof server === 'boolean' ? undefined : server),
        // Development
        develop && vite({run: false}),
        develop &&
          appDevelop({
            env,
            browser,
            server: typeof server === 'object' ? server : undefined,
            ...(typeof develop === 'boolean' ? undefined : develop),
          }),
      );

      await ignoreMissingImports(async () => {
        const {graphql} = await import('@quilted/graphql/sewing-kit');
        use(graphql());
      });

      await ignoreMissingImports(async () => {
        const {workers} = await import('@quilted/workers/sewing-kit');
        use(workers(), appWorkers({baseUrl}));
      });

      await ignoreMissingImports(async () => {
        const {asyncQuilt} = await import('@quilted/async/sewing-kit');
        use(asyncQuilt({preload: true}));
      });

      if (shouldPolyfill) {
        await ignoreMissingImports(async () => {
          const {polyfills} = await import('@quilted/polyfills/sewing-kit');

          use(
            polyfills({
              package: '@quilted/quilt/polyfills',
              features: ['fetch'],
              ...(typeof shouldPolyfill === 'object' ? shouldPolyfill : {}),
            }),
          );
        });
      }
    },
  });
}

export interface ServiceOptions {
  /**
   * Whether this service requires React syntax transformations. Defaults
   * to `false`.
   */
  react?: boolean;
  graphql?: boolean;
  build?: boolean | Partial<Omit<ServiceBuildOptions, 'httpHandler'>>;
  polyfill?: boolean | PolyfillOptions;
  develop?: boolean | Pick<HttpHandlerOptions, 'port'>;
  httpHandler?: boolean | Pick<HttpHandlerOptions, 'port'>;
  env?: EnvironmentOptions;
}

export function quiltService({
  env,
  build = true,
  develop = true,
  graphql = true,
  react: useReact = false,
  polyfill: shouldPolyfill = true,
  httpHandler: useHttpHandler = true,
}: ServiceOptions = {}) {
  const buildOptions: ServiceBuildOptions = {
    env,
    httpHandler: Boolean(useHttpHandler),
    minify: false,
    ...(typeof build === 'boolean' ? {} : build),
  };

  return createProjectPlugin<Service>({
    name: 'Quilt.Service',
    async create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        rollupNode(),
        babelHooks(),
        babelRollup(),
        targets(),
        typescriptProject(),
        tsconfigAliases(),
        esnext(),
        useReact && react(),
        useReact && preact(),
        aliasWorkspacePackages(),
        magicModuleEnv(),
        // Build and http handler setup
        build && serviceBuild(buildOptions),
        useHttpHandler &&
          httpHandler(
            typeof useHttpHandler === 'boolean' ? undefined : useHttpHandler,
          ),
        develop &&
          useHttpHandler &&
          httpHandlerDevelopment({
            env,
            ...(typeof develop === 'boolean' ? undefined : develop),
          }),
      );

      if (graphql) {
        await ignoreMissingImports(async () => {
          const {graphql} = await import('@quilted/graphql/sewing-kit');
          use(graphql());
        });
      }

      if (shouldPolyfill) {
        await ignoreMissingImports(async () => {
          const {polyfills} = await import('@quilted/polyfills/sewing-kit');

          use(
            polyfills({
              package: '@quilted/quilt/polyfills',
              ...(typeof shouldPolyfill === 'object' ? shouldPolyfill : {}),
            }),
          );
        });
      }
    },
  });
}

// TODO
export interface PackageOptions {
  build?: boolean;
  react?: boolean;
  graphql?: boolean;
  commonjs?: PackageBuildOptions['commonjs'];
  bundleNode?: RollupNodeOptions['bundle'];
}

/**
 * Creates a sewing-kit plugin that intelligently configures this package.
 * This includes full support for TypeScript, and both standard and `esnext`
 * builds, if the package is public.
 */
export function quiltPackage({
  build = true,
  react: useReact = false,
  graphql = false,
  commonjs,
  bundleNode,
}: PackageOptions = {}) {
  return createProjectPlugin<Package>({
    name: 'Quilt.Package',
    async create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        rollupNode({bundle: bundleNode}),
        babelHooks(),
        babelRollup(),
        targets(),
        typescriptProject(),
        useReact && react(),
        // Builds
        build && packageBuild({commonjs}),
        build && esnextBuild(),
      );

      if (graphql) {
        await ignoreMissingImports(async () => {
          const {graphql} = await import('@quilted/graphql/sewing-kit');
          use(graphql());
        });
      }
    },
  });
}

export interface WorkspaceOptions {
  graphql?: boolean;
}

/**
 * Creates a sewing-kit plugin that configures your workspace to run
 * ESLint, TypeScript, and Jest.
 */
export function quiltWorkspace({graphql = true}: WorkspaceOptions = {}) {
  return createWorkspacePlugin({
    name: 'Quilt.Workspace',
    async create({use}) {
      use(
        eslint(),
        prettier(),
        babelWorkspaceHooks(),
        workspaceTargets(),
        typescriptWorkspace(),
        jest(),
      );

      if (graphql) {
        await ignoreMissingImports(async () => {
          const {workspaceGraphQL} = await import(
            '@quilted/graphql/sewing-kit'
          );

          use(workspaceGraphQL({package: '@quilted/quilt'}));
        });
      }
    },
  });
}

async function ignoreMissingImports(run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    if ((error as {code?: string})?.code === 'ERR_MODULE_NOT_FOUND') return;
    throw error;
  }
}
