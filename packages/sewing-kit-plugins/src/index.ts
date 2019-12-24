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

// Because we expect quilt to be installed, we can safely assume all its dependencies
// will resolve as well.
// eslint-disable-next-line import/no-extraneous-dependencies
import {webWorkers} from '@quilted/web-workers/sewing-kit';

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
  return createComposedProjectPlugin<WebApp>('Quilt.WebApp', [
    babelConfigurationHooks,
    jestConfigurationHooks,
    json(),
    javascript(),
    typescript(),
    webpack(),
    flexibleOutputs(),
    react(),
    webWorkers(),
    buildWebAppWithWebpack(),
  ]);
}

export interface QuiltServiceOptions {
  devServer?: import('@sewing-kit/plugin-service-base').DevServerOptions;
}

export function quiltService({devServer}: QuiltServiceOptions = {}) {
  return createComposedProjectPlugin<Service>('Quilt.Service', [
    babelConfigurationHooks,
    jestConfigurationHooks,
    webpack(),
    json(),
    javascript(),
    typescript(),
    flexibleOutputs(),
    react(),
    buildServiceWithWebpack(devServer),
    webWorkers(),
  ]);
}

export function quiltWorkspace() {
  return createComposedWorkspacePlugin('Quilt.Workspace', [
    jest(),
    eslint(),
    workspaceJavaScript(),
    workspaceTypeScript(),
  ]);
}
