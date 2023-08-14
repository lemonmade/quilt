/* eslint @typescript-eslint/no-empty-interface: off */

import {createProjectPlugin, createWorkspacePlugin} from './kit.ts';
import type {Project} from './kit.ts';

import {
  moduleBase,
  moduleBuild,
  type BuildOptions as ModuleBuildOptions,
} from './features/modules.ts';
import {packageBase, packageBuild} from './features/packages.ts';
import type {
  Options as PackageBaseOptions,
  BuildOptions as PackageBuildOptions,
} from './features/packages.ts';
import {esnextBuild, esnext} from './features/esnext.ts';
import {fromSource} from './features/from-source.ts';
import {react, type Options as ReactOptions} from './features/react.ts';
import {targets, workspaceTargets} from './features/targets.ts';
import {graphql, workspaceGraphQL} from './features/graphql.ts';
import {asyncQuilt} from './features/async.ts';
import {polyfills} from './features/polyfills.ts';
import type {Options as PolyfillOptions} from './features/polyfills.ts';
import {workers} from './features/workers.ts';
import {reactTesting} from './features/testing.ts';
import {assets as browserAssets} from './features/assets.ts';
import {AssetOptions} from './features/assets.ts';

import {babelHooks, babelWorkspaceHooks, babelRollup} from './tools/babel.ts';
import {browserslist} from './tools/browserslist.ts';
import {rollupHooks, rollupNode} from './tools/rollup.ts';
import type {RollupNodeOptions} from './tools/rollup.ts';
import {eslint} from './tools/eslint.ts';
import {postcss} from './tools/postcss.ts';
import {prettier} from './tools/prettier.ts';
import {jest} from './tools/jest.ts';
import {vite} from './tools/vite.ts';
import {typescriptProject, typescriptWorkspace} from './tools/typescript.ts';
import {stylelint} from './tools/stylelint.ts';

import {javascriptProject, javascriptWorkspace} from './plugins/javascript.ts';
import {aliasWorkspacePackages} from './plugins/alias-workspace-packages.ts';

import {appBase} from './plugins/app-base.ts';
import {appBuild} from './plugins/app-build.ts';
import type {
  AssetOptions as AppBuildAssetOptions,
  AppBrowserOptions,
} from './plugins/app-build.ts';
import {appDevelop} from './plugins/app-develop.ts';
import type {Options as AppDevelopOptions} from './plugins/app-develop.ts';
import {magicModuleApp} from './plugins/magic-module-app.ts';
import {magicModuleBrowserEntry} from './plugins/magic-module-browser-entry.ts';
import {magicModuleAppServerEntry} from './plugins/magic-module-app-server-entry.ts';
import {appServer} from './plugins/app-server-base.ts';
import type {AppServerOptions} from './plugins/app-server-base.ts';
import {appServerBuild} from './plugins/app-server-build.ts';
export type {AppServerBuildHooks} from './plugins/app-server-build.ts';
import {appStatic} from './plugins/app-static.ts';
import type {AppStaticOptions} from './plugins/app-static.ts';
import {appWorkers} from './plugins/app-workers.ts';

import {serviceBase} from './plugins/service-base.ts';
import {serviceBuild} from './plugins/service-build.ts';
import type {Options as ServiceBuildOptions} from './plugins/service-build.ts';
import {serviceDevelopment} from './plugins/service-develop.ts';

import {
  requestRouter,
  requestRouterDevelopment,
} from './plugins/request-router.ts';
import type {Options as RequestRouterOptions} from './plugins/request-router.ts';

import {magicModuleEnv} from './plugins/magic-module-env.ts';
import type {EnvironmentOptions} from './plugins/magic-module-env.ts';

import {tsconfigAliases} from './plugins/tsconfig-aliases.ts';

// Without these exports, TypeScript doesn’t see all the module augmentations
// added by these modules when you try to reference them from another package.
export type {} from './plugins/app-build.ts';
export type {} from './plugins/app-server-build.ts';
export type {} from './plugins/app-auto-server.ts';
export type {} from './plugins/browser-entry.ts';
export type {} from './plugins/request-router.ts';

export * from './constants.ts';
export * from './configuration.ts';

// Re-export for convenience in consumers, these allow them to
// create many plugins without having to grab types from the
// (significantly more complex) `@quilted/craft/kit` entry.
export {createProjectPlugin, createWorkspacePlugin};
export type {Project};

export interface AppOptions {
  /**
   * The entry module for this app. This should be an absolute path, or relative
   * path from the root directory containing your project. This entry should just be
   * for the main `App` component in your project, which Quilt will automatically use
   * to create browser and server-side entries for your project.
   *
   * If you only want to use a custom entry module for the browser build, use the
   * `browser.entry` option instead. If you only want to use a custom entry module
   * for the server-side build, use the `server.entry` option instead.
   *
   * If you do not provide this option explicitly, Quilt will first try to infer it
   * from the `main` field of your `package.json`, and if that file does not exist,
   * will attempt to find a file named `index.{js,ts,tsx}`, `App.{js,ts,tsx}`, or
   * `app.{js,ts,tsx}` at the root of your project.
   *
   * @example './App.tsx'
   */
  entry?: string;

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

  /**
   * Whether this package requires React syntax transformations. Alternatively,
   * you can pass an object of options to configure React transformations.
   *
   * @default true
   */
  react?: boolean | ReactOptions;
}

export function quiltApp({
  entry,
  env,
  polyfill: shouldPolyfill = true,
  develop = true,
  build = true,
  assets = {},
  browser = {},
  static: renderStatic = false,
  server = !renderStatic,
  react: reactOptions = true,
}: AppOptions = {}) {
  const {minify = true, baseUrl = '/assets/', ...assetOptions} = assets;

  const useRequestRouter =
    typeof server === 'boolean'
      ? server
      : server.format == null || server.format === 'request-router';

  return createProjectPlugin({
    name: 'Quilt.App',
    async create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        rollupNode(),
        babelHooks(),
        babelRollup(),
        postcss(),
        browserslist(),
        javascriptProject(),
        typescriptProject(),
        tsconfigAliases(),
        esnext(),
        fromSource(),
        Boolean(reactOptions) &&
          react(typeof reactOptions === 'object' ? reactOptions : undefined),
        appBase({
          entry,
          server: Boolean(server),
          static: Boolean(renderStatic),
        }),
        aliasWorkspacePackages(),
        // Magic modules
        magicModuleApp(),
        magicModuleBrowserEntry({hydrate: Boolean(server)}),
        magicModuleAppServerEntry(),
        magicModuleEnv(),
        // Build and auto-server setup
        server && appServer(typeof server === 'boolean' ? undefined : server),
        server && useRequestRouter && requestRouter(),
        server && useRequestRouter && requestRouterDevelopment(),
        build && browserAssets({baseUrl, ...assetOptions}),
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
        Boolean(reactOptions) && reactTesting(),
        targets(),
        shouldPolyfill &&
          polyfills({
            features: ['fetch', 'abort-controller'],
            ...(typeof shouldPolyfill === 'object' ? shouldPolyfill : {}),
          }),
      );
    },
  });
}

export interface ServiceOptions {
  /**
   * The entry module for this service. This should be an absolute path, or relative
   * path from the root directory containing your project.
   *
   * If you do not provide this option explicitly, Quilt will first try to infer it
   * from the `main` field of your `package.json`, and if that file does not exist,
   * will attempt to find a file named `index.{js,ts,tsx}`, `App.{js,ts,tsx}`, or
   * `app.{js,ts,tsx}` at the root of your project.
   */
  entry?: string;

  /**
   * Whether this package requires React syntax transformations. Alternatively,
   * you can pass an object of options to configure React transformations.
   *
   * @default false
   */
  react?: boolean | ReactOptions;
  graphql?: boolean;
  build?: boolean | Partial<Omit<ServiceBuildOptions, 'format'>>;
  polyfill?: boolean | PolyfillOptions;
  develop?: boolean | Pick<RequestRouterOptions, 'port'>;
  format?: 'request-router' | 'custom';
  port?: number;
  env?: EnvironmentOptions;
}

export function quiltService({
  entry,
  env,
  port,
  format = 'request-router',
  build = true,
  develop = true,
  graphql: useGraphQL = true,
  react: reactOptions = false,
  polyfill: shouldPolyfill = true,
}: ServiceOptions = {}) {
  const useRequestRouter = format === 'request-router';
  const buildOptions: ServiceBuildOptions = {
    env,
    format,
    minify: false,
    ...(typeof build === 'boolean' ? {} : build),
  };

  return createProjectPlugin({
    name: 'Quilt.Service',
    async create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        rollupNode(),
        babelHooks(),
        babelRollup(),
        browserslist(),
        javascriptProject(),
        typescriptProject(),
        tsconfigAliases(),
        esnext(),
        fromSource(),
        Boolean(reactOptions) &&
          react(typeof reactOptions === 'object' ? reactOptions : undefined),
        serviceBase({entry}),
        aliasWorkspacePackages(),
        magicModuleEnv(),
        // Build and http handler setup
        build && serviceBuild(buildOptions),
        useRequestRouter && requestRouter({port}),
        develop &&
          useRequestRouter &&
          requestRouterDevelopment({
            env,
            port,
            ...(typeof develop === 'boolean' ? undefined : develop),
          }),
        develop && useRequestRouter && serviceDevelopment(),
        useGraphQL && graphql(),
        Boolean(reactOptions) && reactTesting(),
        targets(),
        shouldPolyfill &&
          polyfills({
            features: ['fetch', 'abort-controller'],
            ...(typeof shouldPolyfill === 'object' ? shouldPolyfill : {}),
          }),
      );
    },
  });
}

// TODO
export interface PackageOptions
  extends Pick<PackageBaseOptions, 'entries' | 'executable'> {
  build?:
    | boolean
    | ({
        bundle?: RollupNodeOptions['bundle'];

        /**
         * Whether to build an “ESNext” version of your package. This version
         * will do minimal transpilation, keeping the resulting builds extremely
         * close to your source code. Quilt apps and services that depend on your
         * package will then re-compile the ESNext outputs to match the language
         * features in the runtime environment they are targeting.
         *
         * @default true
         * @see https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/builds.md#esnext-build
         */
        esnext?: boolean;
      } & Pick<PackageBuildOptions, 'commonjs'>);

  /**
   * Whether this package requires React syntax transformations. Alternatively,
   * you can pass an object of options to configure React transformations.
   *
   * @default true
   */
  react?: boolean | ReactOptions;
  graphql?: boolean;
}

/**
 * Configures this package, including full support for TypeScript,
 * and both standard and `esnext` builds, if the package is public.
 */
export function quiltPackage({
  entries,
  executable,
  build = true,
  react: reactOptions = true,
  graphql: useGraphQL = false,
}: PackageOptions = {}) {
  return createProjectPlugin({
    name: 'Quilt.Package',
    async create({use}) {
      let buildOption: PackageBuildOptions | undefined;
      let bundleOption: RollupNodeOptions['bundle'] | undefined;
      let buildESNext = true;

      if (typeof build === 'object') {
        const {bundle, esnext, ...rest} = build;

        buildOption = rest;
        bundleOption = bundle;
        buildESNext = esnext ?? buildESNext;
      }

      use(
        // Basic tool configuration
        rollupHooks(),
        babelHooks(),
        babelRollup(),
        browserslist(),
        javascriptProject(),
        typescriptProject(),
        esnext(),
        fromSource(),
        Boolean(reactOptions) &&
          react(typeof reactOptions === 'object' ? reactOptions : undefined),
        Boolean(reactOptions) && reactTesting(),
        useGraphQL && graphql(),
        rollupNode({bundle: bundleOption}),
        packageBase({entries, executable}),
        // Builds
        build && packageBuild(buildOption),
        buildESNext && esnextBuild(),
        targets(),
      );
    },
  });
}

// TODO
export interface ModuleOptions {
  entry?: string;
  build?:
    | boolean
    | ({
        bundle?: RollupNodeOptions['bundle'];
      } & ModuleBuildOptions);

  /**
   * Whether this package requires React syntax transformations. Alternatively,
   * you can pass an object of options to configure React transformations.
   *
   * @default true
   */
  react?: boolean | ReactOptions;

  graphql?: boolean;
}

/**
 * Configures a JavaScript module that will be run in a browser.
 */
export function quiltModule({
  entry,
  build = true,
  react: reactOptions = true,
  graphql: useGraphQL = false,
}: ModuleOptions = {}) {
  return createProjectPlugin({
    name: 'Quilt.Module',
    async create({use}) {
      let bundleOption: RollupNodeOptions['bundle'] | undefined;
      let buildOptions: ModuleBuildOptions | undefined;

      if (typeof build === 'object') {
        const {bundle, ...rest} = build;

        bundleOption = bundle;
        buildOptions = rest;
      }

      use(
        // Basic tool configuration
        rollupHooks(),
        babelHooks(),
        babelRollup(),
        browserslist(),
        javascriptProject(),
        typescriptProject(),
        esnext(),
        fromSource(),
        Boolean(reactOptions) &&
          react(typeof reactOptions === 'object' ? reactOptions : undefined),
        Boolean(reactOptions) && reactTesting(),
        useGraphQL && graphql(),
        rollupNode({bundle: bundleOption}),
        moduleBase({entry}),
        // Builds
        build && moduleBuild(buildOptions),
        targets(),
      );
    },
  });
}

export interface WorkspaceOptions {
  graphql?: boolean;
  lint?: {styles?: boolean; scripts?: boolean};
}

/**
 * Configures your workspace to run ESLint, TypeScript, and Jest.
 */
export function quiltWorkspace({
  graphql = true,
  lint: lintOptions,
}: WorkspaceOptions = {}) {
  const lint: Required<NonNullable<WorkspaceOptions['lint']>> = {
    scripts: true,
    styles: true,
    ...lintOptions,
  };

  return createWorkspacePlugin({
    name: 'Quilt.Workspace',
    async create({use}) {
      use(
        lint.scripts && eslint(),
        lint.styles && stylelint(),
        prettier(),
        babelWorkspaceHooks(),
        workspaceTargets(),
        javascriptWorkspace(),
        typescriptWorkspace(),
        jest(),
        graphql && workspaceGraphQL({package: '@quilted/quilt/graphql'}),
      );
    },
  });
}
