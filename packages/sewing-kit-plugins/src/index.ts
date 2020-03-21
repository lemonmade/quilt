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
import {css, workspaceCSS} from '@sewing-kit/plugin-css';
import {sass} from '@sewing-kit/plugin-sass';
import {stylelint} from '@sewing-kit/plugin-stylelint';
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

export interface QuiltWebAppOptions {
  readonly sass?: boolean | Parameters<typeof sass>[0];
  readonly stylelint?: Parameters<typeof stylelint>[0];
  readonly assetServer?: import('@sewing-kit/plugin-web-app-base').Options['assetServer'];
}

export function quiltWebApp({
  assetServer,
  sass: useSass = false,
}: QuiltWebAppOptions = {}) {
  return createComposedProjectPlugin<WebApp>(
    'Quilt.WebApp',
    async (composer) => {
      composer.use(
        babelConfigurationHooks,
        jestConfigurationHooks,
        webpack(),
        json(),
        javascript(),
        typescript(),
        css(),
        useSass && sass(typeof useSass === 'boolean' ? {} : useSass),
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
  readonly sass?: boolean | Parameters<typeof sass>[0];
  readonly devServer?: import('@sewing-kit/plugin-service-base').DevServerOptions;
}

export function quiltService({
  devServer,
  sass: useSass,
}: QuiltServiceOptions = {}) {
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
        css(),
        useSass && sass(typeof useSass === 'boolean' ? {} : useSass),
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
    workspaceJavaScript(),
    workspaceTypeScript(),
    workspaceCSS(),
  ]);
}

async function ignoreMissingImports<T>(perform: () => Promise<T>) {
  try {
    await perform();
  } catch {
    // intentional noop
  }
}
