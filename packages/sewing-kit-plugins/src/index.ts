import {
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
} from '@sewing-kit/plugins';

import {packageFlexibleOutputsConsumerPlugin} from '@sewing-kit/plugin-package-flexible-outputs';
import {webpackProjectPlugin} from '@sewing-kit/plugin-webpack';
import {webAppWebpackPlugin} from '@sewing-kit/plugin-web-app-base';
import {
  serviceWebpackPlugin,
  configureDevServer,
} from '@sewing-kit/plugin-service-base';
import {jsonProjectPlugin} from '@sewing-kit/plugin-json';
import {eslintWorkspacePlugin} from '@sewing-kit/plugin-eslint';
import {
  javascriptWorkspacePlugin,
  javascriptProjectPlugin,
} from '@sewing-kit/plugin-javascript';
import {
  typeScriptWorkspacePlugin,
  typeScriptProjectPlugin,
} from '@sewing-kit/plugin-typescript';
import {reactProjectPlugin} from '@sewing-kit/plugin-react';
import {babelProjectPlugin} from '@sewing-kit/plugin-babel';
import {jestWorkspacePlugin, jestProjectPlugin} from '@sewing-kit/plugin-jest';

// Because we expect quilt to be installed, we can safely assume all its dependencies
// will resolve as well.
// eslint-disable-next-line import/no-extraneous-dependencies
import {useWebWorkers} from '@quilted/web-workers/sewing-kit';

export function createQuiltPackagePlugin() {
  return createComposedProjectPlugin('Quilt.Package', [
    babelProjectPlugin,
    jestProjectPlugin,
    jsonProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    reactProjectPlugin,
  ]);
}

export const quiltPackagePlugin = createQuiltPackagePlugin();

export function createQuiltWebAppPlugin() {
  return createComposedProjectPlugin('Quilt.WebApp', [
    babelProjectPlugin,
    webpackProjectPlugin,
    jestProjectPlugin,
    jsonProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    packageFlexibleOutputsConsumerPlugin,
    reactProjectPlugin,
    useWebWorkers(),
    webAppWebpackPlugin,
  ]);
}

export const quiltWebAppPlugin = createQuiltWebAppPlugin();

export interface QuiltServiceOptions {
  devServer?: import('@sewing-kit/plugin-service-base').DevServerOptions;
}

export function createQuiltServicePlugin({
  devServer,
}: QuiltServiceOptions = {}) {
  return createComposedProjectPlugin('Quilt.Service', [
    babelProjectPlugin,
    webpackProjectPlugin,
    jestProjectPlugin,
    jsonProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    packageFlexibleOutputsConsumerPlugin,
    reactProjectPlugin,
    serviceWebpackPlugin,
    devServer && configureDevServer(devServer),
    useWebWorkers(),
  ]);
}

export const quiltServicePlugin = createQuiltServicePlugin();

export function createQuiltWorkspacePlugin() {
  return createComposedWorkspacePlugin('Quilt.Workspace', [
    eslintWorkspacePlugin,
    javascriptWorkspacePlugin,
    typeScriptWorkspacePlugin,
    jestWorkspacePlugin,
  ]);
}

export const quiltWorkspacePlugin = createQuiltWorkspacePlugin();
