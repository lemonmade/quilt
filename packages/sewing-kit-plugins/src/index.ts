import {
  Package,
  Service,
  WebApp,
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
} from '@sewing-kit/plugins';

import {flexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';
import {webpackHooks} from '@sewing-kit/plugin-webpack';
import {buildWebAppWithWebpack} from '@sewing-kit/plugin-web-app-base';
import {buildServiceWithWebpack} from '@sewing-kit/plugin-service-base';
import {eslint} from '@sewing-kit/plugin-eslint';
import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript, workspaceTypeScript} from '@sewing-kit/plugin-typescript';
import {css} from '@sewing-kit/plugin-css';
import {stylelint} from '@sewing-kit/plugin-stylelint';
import {react} from '@sewing-kit/plugin-react';
import {jest, jestProjectHooks} from '@sewing-kit/plugin-jest';

export function quiltPackage({react: useReact = true} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.Package', [
    javascript(),
    typescript(),
    jestProjectHooks(),
    useReact && react(),
  ]);
}

export interface QuiltWebAppOptions {
  readonly assetServer?: NonNullable<
    Parameters<typeof buildWebAppWithWebpack>[0]
  >['assetServer'];
}

export function quiltWebApp({assetServer}: QuiltWebAppOptions = {}) {
  return createComposedProjectPlugin<WebApp>(
    'Quilt.WebApp',
    async (composer) => {
      composer.use(
        javascript(),
        typescript(),
        css(),
        webpackHooks(),
        jestProjectHooks(),
        buildWebAppWithWebpack({assetServer}),
        flexibleOutputs(),
        react(),
      );

      await Promise.all([
        ignoreMissingImports(async () => {
          const {reactWebWorkers} = await import(
            '@quilted/react-web-workers/sewing-kit'
          );
          composer.use(reactWebWorkers());
        }),
        ignoreMissingImports(async () => {
          const {asyncQuilt} = await import('@quilted/async/sewing-kit');
          composer.use(asyncQuilt());
        }),
      ]);
    },
  );
}

export interface QuiltServiceOptions {
  readonly devServer?: NonNullable<
    Parameters<typeof buildServiceWithWebpack>[0]
  >;
}

export function quiltService({devServer}: QuiltServiceOptions = {}) {
  return createComposedProjectPlugin<Service>(
    'Quilt.Service',
    async (composer) => {
      composer.use(
        javascript(),
        typescript(),
        css(),
        webpackHooks(),
        flexibleOutputs(),
        react(),
        buildServiceWithWebpack(devServer),
      );

      await Promise.all([
        ignoreMissingImports(async () => {
          const {reactWebWorkers} = await import(
            '@quilted/react-web-workers/sewing-kit'
          );
          composer.use(reactWebWorkers());
        }),
      ]);
    },
  );
}

export interface QuiltWorkspaceOptions {
  readonly stylelint?: Parameters<typeof stylelint>[0];
}

export function quiltWorkspace({
  stylelint: stylelintOptions,
}: QuiltWorkspaceOptions = {}) {
  return createComposedWorkspacePlugin('Quilt.Workspace', [
    jest(),
    eslint(),
    stylelint(stylelintOptions),
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
