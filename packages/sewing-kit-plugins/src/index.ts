import {
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
} from '@sewing-kit/plugins';

import {packageFlexibleOutputsConsumerPlugin} from '@sewing-kit/plugin-package-flexible-outputs';
import {webpackProjectPlugin} from '@sewing-kit/plugin-webpack';
import {webAppWebpackPlugin} from '@sewing-kit/plugin-web-app-base';
import {serviceWebpackPlugin} from '@sewing-kit/plugin-service-base';
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

export function createQuiltPackagePlugin() {
  return createComposedProjectPlugin('Quilt.Package', [
    babelProjectPlugin,
    jestProjectPlugin,
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
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    packageFlexibleOutputsConsumerPlugin,
    reactProjectPlugin,
    webAppWebpackPlugin,
  ]);
}

export const quiltWebAppPlugin = createQuiltWebAppPlugin();

export function createQuiltServicePlugin() {
  return createComposedProjectPlugin('Quilt.Service', [
    babelProjectPlugin,
    webpackProjectPlugin,
    jestProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    packageFlexibleOutputsConsumerPlugin,
    reactProjectPlugin,
    serviceWebpackPlugin,
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
