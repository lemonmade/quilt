import {
  Runtime,
  createProjectPlugin,
  createWorkspacePlugin,
  createApp,
  createPackage,
  createService,
  createWorkspace,
} from '@quilted/sewing-kit';
import type {
  App,
  Service,
  Package,
  Project,
  WaterfallHook,
} from '@quilted/sewing-kit';

import {babelHooks} from '@quilted/sewing-kit-babel';
import {packageBuild} from '@quilted/sewing-kit-package';
import {rollupHooks, rollupNode} from '@quilted/sewing-kit-rollup';
import type {RollupNodeOptions} from '@quilted/sewing-kit-rollup';
import {eslint} from '@quilted/sewing-kit-eslint';
import {esnextBuild} from '@quilted/sewing-kit-esnext';
import {jest} from '@quilted/sewing-kit-jest';
import {
  typescriptProject,
  typescriptWorkspace,
} from '@quilted/sewing-kit-typescript';

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

export interface HttpHandlerHooks {
  quiltHttpHandlerRuntimeContent: WaterfallHook<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends HttpHandlerHooks {}
  interface BuildServiceConfigurationHooks extends HttpHandlerHooks {}
}

export const MAGIC_MODULE_APP_COMPONENT = '__quilt__/App.tsx';
export const MAGIC_MODULE_APP_ASSET_MANIFEST = '__quilt__/AssetManifest.tsx';
export const MAGIC_MODULE_HTTP_HANDLER = '__quilt__/HttpHandler.tsx';

// TODO
export interface PackageOptions {
  bundleNode?: RollupNodeOptions['bundle'];
}

/**
 * Creates a sewing-kit plugin that intelligently configures this package.
 * This includes full support for TypeScript, and both standard and `esnext`
 * builds, if the package is public.
 */
export function quiltPackage({bundleNode}: PackageOptions = {}) {
  return createProjectPlugin<Package>({
    name: 'Quilt.Package',
    create({use}) {
      use(
        // Basic tool configuration
        rollupHooks(),
        rollupNode({bundle: bundleNode}),
        babelHooks(),
        typescriptProject(),
        // Builds
        packageBuild(),
        esnextBuild(),
      );
    },
  });
}

/**
 * Creates a sewing-kit plugin that configures your workspace to run
 * ESLint and TypeScript.
 */
export function quiltWorkspace() {
  return createWorkspacePlugin({
    name: 'Quilt.Workspace',
    create({use}) {
      use(eslint(), typescriptWorkspace(), jest());
    },
  });
}
