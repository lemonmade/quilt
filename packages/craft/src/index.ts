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

import {babelHooks, babelRollup} from '@quilted/sewing-kit-babel';
import {packageBuild} from '@quilted/sewing-kit-package';
import type {Options as PackageBuildOptions} from '@quilted/sewing-kit-package';
import {rollupHooks, rollupNode} from '@quilted/sewing-kit-rollup';
import type {RollupNodeOptions} from '@quilted/sewing-kit-rollup';
import {eslint} from '@quilted/sewing-kit-eslint';
import {prettier} from '@quilted/sewing-kit-prettier';
import {esnextBuild, esnext} from '@quilted/sewing-kit-esnext';
import {react} from '@quilted/sewing-kit-react';
import {targets} from '@quilted/sewing-kit-targets';
import {jest} from '@quilted/sewing-kit-jest';
import {vite} from '@quilted/sewing-kit-vite';
import {
  typescriptProject,
  typescriptWorkspace,
} from '@quilted/sewing-kit-typescript';

import type {Options as PolyfillOptions} from '@quilted/polyfills/sewing-kit';

import {preact} from './plugins/preact';
import {appBuild} from './plugins/app-build';
import type {AssetOptions as AppBuildAssetOptions} from './plugins/app-build';
import {appDevelop} from './plugins/app-develop';
import {magicModuleApp} from './plugins/magic-module-app';
import {appAutoServer} from './plugins/app-auto-server';
import {serviceBuild} from './plugins/service-build';
import type {Options as ServiceBuildOptions} from './plugins/service-build';

import {httpHandler, httpHandlerDevelopment} from './plugins/http-handler';
import type {Options as HttpHandlerOptions} from './plugins/http-handler';

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
  autoServer?: boolean;
  develop?: boolean;
  build?: boolean;
  assets?: Partial<AppBuildAssetOptions>;
}

export function quiltApp({
  polyfill: shouldPolyfill = true,
  autoServer = true,
  develop = true,
  build = true,
  assets = {},
}: AppOptions = {}) {
  const {minify = true, baseUrl = '/assets/'} = assets;

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
        esnext(),
        react(),
        preact(),
        // Build and auto-server setup
        magicModuleApp(),
        build && appBuild({assets: {minify, baseUrl}}),
        build && autoServer && httpHandler(),
        build && autoServer && appAutoServer(),
        // Development
        develop && vite(),
        develop && appDevelop(),
      );

      await ignoreMissingImports(async () => {
        const {graphql} = await import('@quilted/graphql/sewing-kit');
        use(graphql());
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
}

export function quiltService({
  build = true,
  develop = true,
  graphql = true,
  react: useReact = false,
  polyfill: shouldPolyfill = true,
  httpHandler: useHttpHandler = true,
}: ServiceOptions = {}) {
  const buildOptions: ServiceBuildOptions = {
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
        esnext(),
        useReact && react(),
        useReact && preact(),
        // Build and http handler setup
        build && serviceBuild(buildOptions),
        useHttpHandler &&
          httpHandler(
            typeof useHttpHandler === 'boolean' ? undefined : useHttpHandler,
          ),
        develop &&
          useHttpHandler &&
          httpHandlerDevelopment(
            typeof develop === 'boolean' ? undefined : develop,
          ),
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
            polyfills(
              typeof shouldPolyfill === 'object' ? shouldPolyfill : undefined,
            ),
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
      use(eslint(), prettier(), typescriptWorkspace(), jest());

      if (graphql) {
        await ignoreMissingImports(async () => {
          const {workspaceGraphQL} = await import(
            '@quilted/graphql/sewing-kit'
          );

          use(workspaceGraphQL());
        });
      }
    },
  });
}

async function ignoreMissingImports(run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') return;
    throw error;
  }
}
