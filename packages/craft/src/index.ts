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
import {
  typescriptProject,
  typescriptWorkspace,
} from '@quilted/sewing-kit-typescript';

import type {Options as PolyfillOptions} from '@quilted/polyfills/sewing-kit';

import {preact} from './plugins/preact';
import {appCss} from './plugins/app-css';
import {appBuild} from './plugins/app-build';
import {browserEntry} from './plugins/browser-entry';
import {magicModuleApp} from './plugins/magic-module-app';
import {appAutoServer} from './plugins/app-auto-server';
import {serviceBuild} from './plugins/service-build';
import {httpHandler, httpHandlerDevelopment} from './plugins/http-handler';
import type {Options as HttpHandlerOptions} from './plugins/http-handler';

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
  assets?: {baseUrl?: string};
}

export function quiltApp({
  polyfill: shouldPolyfill = true,
  autoServer = true,
  assets: {baseUrl = '/assets/'} = {},
}: AppOptions = {}) {
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
        browserEntry(),
        appBuild(),
        appCss(),
        autoServer && httpHandler(),
        autoServer && appAutoServer(),
      );

      await ignoreMissingImports(async () => {
        const {asyncQuilt} = await import('@quilted/async/sewing-kit');
        use(
          asyncQuilt({
            preload: true,
            assetBaseUrl: baseUrl,
          }),
        );
      });

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

export interface ServiceOptions {
  /**
   * Whether this service requires React syntax transformations. Defaults
   * to `false`.
   */
  react?: boolean;
  build?: boolean;
  polyfill?: boolean | PolyfillOptions;
  develop?: boolean | Pick<HttpHandlerOptions, 'port'>;
  httpHandler?: boolean | Pick<HttpHandlerOptions, 'port'>;
}

export function quiltService({
  build = true,
  develop = true,
  react: useReact = false,
  polyfill: shouldPolyfill = true,
  httpHandler: useHttpHandler = true,
}: ServiceOptions = {}) {
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
        build && serviceBuild({httpHandler: Boolean(useHttpHandler)}),
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
  commonjs,
  bundleNode,
}: PackageOptions = {}) {
  return createProjectPlugin<Package>({
    name: 'Quilt.Package',
    create({use}) {
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
    },
  });
}

/**
 * Creates a sewing-kit plugin that configures your workspace to run
 * ESLint, TypeScript, and Jest.
 */
export function quiltWorkspace() {
  return createWorkspacePlugin({
    name: 'Quilt.Workspace',
    create({use}) {
      use(eslint(), prettier(), typescriptWorkspace(), jest());
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
