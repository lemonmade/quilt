/* eslint @typescript-eslint/no-empty-interface: off */

import {Runtime, createProjectPlugin, createWorkspacePlugin} from './kit';
import type {App, Service, Package, Project} from './kit';
import {
  createApp,
  createPackage,
  createService,
  createWorkspace,
} from './configuration';

import {packageBuild} from './features/packages';
import type {Options as PackageBuildOptions} from './features/packages';
import {esnextBuild, esnext} from './features/esnext';
import {react} from './features/react';
import {targets, workspaceTargets} from './features/targets';
import {graphql, workspaceGraphQL} from './features/graphql';
import {asyncQuilt} from './features/async';
import {polyfills} from './features/polyfills';
import type {Options as PolyfillOptions} from './features/polyfills';
import {workers} from './features/workers';
import {reactTesting} from './features/testing';
import {assets as staticAssets} from './features/assets';
import {AssetOptions} from './features/assets';

import {babelHooks, babelWorkspaceHooks, babelRollup} from './tools/babel';
import {rollupHooks, rollupNode} from './tools/rollup';
import type {RollupNodeOptions} from './tools/rollup';
import {eslint} from './tools/eslint';
import {postcss} from './tools/postcss';
import {prettier} from './tools/prettier';
import {jest} from './tools/jest';
import {vite} from './tools/vite';
import {typescriptProject, typescriptWorkspace} from './tools/typescript';

import {javascriptProject, javascriptWorkspace} from './plugins/javascript';
import {aliasWorkspacePackages} from './plugins/alias-workspace-packages';
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

import {appServer} from './plugins/app-server-base';
import type {AppServerOptions} from './plugins/app-server-base';
import {appServerBuild} from './plugins/app-server-build';
import type {} from './plugins/app-server-build';

import {appStatic} from './plugins/app-static';
import type {AppStaticOptions} from './plugins/app-static';

import {appWorkers} from './plugins/app-workers';
import {serviceBuild} from './plugins/service-build';
import type {Options as ServiceBuildOptions} from './plugins/service-build';
import {serviceDevelopment} from './plugins/service-develop';

import {httpHandler, httpHandlerDevelopment} from './plugins/http-handler';
import type {Options as HttpHandlerOptions} from './plugins/http-handler';

import {tsconfigAliases} from './plugins/tsconfig-aliases';

// Without these exports, TypeScript doesn’t see all the module augmentations
// added by these modules when you try to reference them from another package.
export type {} from './plugins/app-build';
export type {} from './plugins/app-server-build';
export type {} from './plugins/app-auto-server';
export type {} from './plugins/browser-entry';
export type {} from './plugins/http-handler';

// Re-export for convenience in consumers, these allow them to
// create many plugins without having to grab types from the
// (significantly more complex) `@quilted/craft/kit` entry.
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
  assets?: Partial<AppBuildAssetOptions & AssetOptions>;

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
  const {minify = true, baseUrl = '/assets/', ...assetOptions} = assets;

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
        postcss(),
        targets(),
        javascriptProject(),
        typescriptProject(),
        tsconfigAliases(),
        esnext(),
        react(),
        aliasWorkspacePackages(),
        // Magic modules
        magicModuleApp(),
        magicModuleBrowserEntry({hydrate: Boolean(server)}),
        magicModuleAppServerEntry(),
        magicModuleEnv(),
        // Build and auto-server setup
        server && appServer(typeof server === 'boolean' ? undefined : server),
        server && useHttpHandler && httpHandler(),
        server && useHttpHandler && httpHandlerDevelopment(),
        build && staticAssets({baseUrl, ...assetOptions}),
        build &&
          appBuild({
            env,
            browser,
            server: Boolean(server),
            static: Boolean(renderStatic),
            assets: {minify},
          }),
        build &&
          renderStatic &&
          appStatic(
            typeof renderStatic === 'boolean' ? undefined : renderStatic,
          ),
        build &&
          server &&
          appServerBuild(typeof server === 'boolean' ? undefined : server),
        // Development
        develop && vite({run: false}),
        develop &&
          appDevelop({
            env,
            browser,
            server: typeof server === 'object' ? server : undefined,
            ...(typeof develop === 'boolean' ? undefined : develop),
          }),

        graphql(),
        workers(),
        appWorkers({baseUrl}),
        asyncQuilt({preload: true}),
        reactTesting({environment: 'preact'}),
        shouldPolyfill &&
          polyfills({
            package: '@quilted/quilt/polyfills',
            features: ['fetch', 'abort-controller'],
            ...(typeof shouldPolyfill === 'object' ? shouldPolyfill : {}),
          }),
      );
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
  graphql: useGraphQL = true,
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
        javascriptProject(),
        typescriptProject(),
        tsconfigAliases(),
        esnext(),
        useReact && react(),
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
        develop && useHttpHandler && serviceDevelopment(),
        useGraphQL && graphql(),
        useReact && reactTesting({environment: 'preact'}),
        shouldPolyfill &&
          polyfills({
            package: '@quilted/quilt/polyfills',
            ...(typeof shouldPolyfill === 'object' ? shouldPolyfill : {}),
          }),
      );
    },
  });
}

// TODO
export interface PackageOptions {
  build?: boolean | {bundle?: RollupNodeOptions['bundle']};
  react?: boolean;
  graphql?: boolean;
  commonjs?: PackageBuildOptions['commonjs'];
}

/**
 * Configures this package, including full support for TypeScript,
 * and both standard and `esnext` builds, if the package is public.
 */
export function quiltPackage({
  build = true,
  react: useReact = false,
  graphql: useGraphQL = false,
  commonjs,
}: PackageOptions = {}) {
  return createProjectPlugin<Package>({
    name: 'Quilt.Package',
    async create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        babelHooks(),
        babelRollup(),
        targets(),
        javascriptProject(),
        typescriptProject(),
        useReact && react(),
        useReact && reactTesting({environment: 'preact'}),
        useGraphQL && graphql(),
        rollupNode({
          bundle: typeof build === 'boolean' ? undefined : build.bundle,
        }),
        // Builds
        build && packageBuild({commonjs}),
        build && esnextBuild(),
      );
    },
  });
}

export interface WorkspaceOptions {
  graphql?: boolean;
}

/**
 * Configures your workspace to run ESLint, TypeScript, and Jest.
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
        javascriptWorkspace(),
        typescriptWorkspace(),
        jest(),
        graphql && workspaceGraphQL({package: '@quilted/quilt'}),
      );
    },
  });
}
