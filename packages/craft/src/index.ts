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
import {esnextBuild} from '@quilted/sewing-kit-esnext';
import {typescriptProject} from '@quilted/sewing-kit-typescript';

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

/**
 * Creates a sewing-kit plugin that intelligently configures this package.
 * This includes full support for TypeScript, and both standard and `esnext`
 * builds, if the package is public.
 */
export function quiltPackage() {
  return createProjectPlugin<Package>({
    name: 'Quilt.Package',
    compose({use}) {
      // Basic tool configuration
      use(
        rollupHooks(),
        rollupNode(),
        babelHooks(),
        typescriptProject(),
        packageBuild(),
        esnextBuild(),
      );
    },
  });
}
