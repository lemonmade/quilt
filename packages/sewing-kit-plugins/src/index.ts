import {
  Package,
  Service,
  WebApp,
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
} from '@sewing-kit/plugins';

import {flexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';
import {webpack} from '@sewing-kit/plugin-webpack';
import {buildWebAppWithWebpack} from '@sewing-kit/plugin-web-app-base';
import {buildServiceWithWebpack} from '@sewing-kit/plugin-service-base';
import {json} from '@sewing-kit/plugin-json';
import {eslint} from '@sewing-kit/plugin-eslint';
import {javascript, workspaceJavaScript} from '@sewing-kit/plugin-javascript';
import {typescript, workspaceTypeScript} from '@sewing-kit/plugin-typescript';
import {react} from '@sewing-kit/plugin-react';
import {babelConfigurationHooks} from '@sewing-kit/plugin-babel';
import {jest, jestConfigurationHooks} from '@sewing-kit/plugin-jest';

export function quiltPackage({react: useReact = true} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.Package', [
    babelConfigurationHooks,
    jestConfigurationHooks,
    json(),
    javascript(),
    typescript(),
    useReact && react(),
  ]);
}

export function quiltWebApp() {
  return createComposedProjectPlugin<WebApp>(
    'Quilt.WebApp',
    async (composer) => {
      composer.use(
        babelConfigurationHooks,
        jestConfigurationHooks,
        json(),
        javascript(),
        typescript(),
        webpack(),
        buildWebAppWithWebpack(),
        flexibleOutputs(),
        react(),
      );

      await Promise.all([
        ignoreMissingImports(async () => {
          const {webWorkers} = await import('@quilted/web-workers/sewing-kit');
          composer.use(webWorkers());
        }),
      ]);
    },
  );
}

export interface QuiltServiceOptions {
  devServer?: import('@sewing-kit/plugin-service-base').DevServerOptions;
}

export function quiltService({devServer}: QuiltServiceOptions = {}) {
  return createComposedProjectPlugin<Service>(
    'Quilt.Service',
    async (composer) => {
      composer.use(
        babelConfigurationHooks,
        jestConfigurationHooks,
        webpack(),
        json(),
        javascript(),
        typescript(),
        flexibleOutputs(),
        react(),
        buildServiceWithWebpack(devServer),
      );

      await Promise.all([
        ignoreMissingImports(async () => {
          const {webWorkers} = await import('@quilted/web-workers/sewing-kit');
          composer.use(webWorkers());
        }),
      ]);
    },
  );
}

export function quiltWorkspace() {
  return createComposedWorkspacePlugin('Quilt.Workspace', [
    jest(),
    eslint(),
    workspaceJavaScript(),
    workspaceTypeScript(),
  ]);
}

async function ignoreMissingImports<T>(perform: () => Promise<T>) {
  try {
    await perform();
  } catch {
    // intentional noop
  }
}
