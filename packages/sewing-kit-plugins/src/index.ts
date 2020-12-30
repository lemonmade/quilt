import {
  Package,
  Service,
  WebApp,
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
  Task,
} from '@sewing-kit/plugins';

import {flexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';
import {webpackHooks, webpackBuild} from '@sewing-kit/plugin-webpack';
import {webpackDevWebApp} from '@sewing-kit/plugin-web-app-base';
import {webpackDevService} from '@sewing-kit/plugin-service-base';
import {eslint} from '@sewing-kit/plugin-eslint';
import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript, workspaceTypeScript} from '@sewing-kit/plugin-typescript';
import {css} from '@sewing-kit/plugin-css';
import {stylelint} from '@sewing-kit/plugin-stylelint';
import {react} from '@sewing-kit/plugin-react';
import {jest} from '@sewing-kit/plugin-jest';
import {graphql, workspaceGraphQL} from '@sewing-kit/plugin-graphql';
import type {ExportStyle} from '@sewing-kit/plugin-graphql';

import {cdn} from './cdn';
import {brotli} from './brotli';
import {polyfills} from './polyfills';
import {preactAliases} from './preact-aliases';
import {webAppAutoServer} from './web-app-auto-server';
import {webAppBrowserEntry} from './web-app-browser-entry';
import {webAppMagicModules} from './web-app-magic-modules';
import {webAppMultiBuilds} from './web-app-multi-build';
import {webAppConvenienceAliases} from './web-app-convenience-aliases';
import type {PolyfillFeature} from './types';

// eslint-disable-next-line prettier/prettier
export type {} from './web-app-auto-server';

export {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_AUTO_SERVER_ASSETS,
} from './constants';

export interface QuiltPackageOptions {
  readonly react?: boolean | 'preact';
  readonly css?: boolean;
}

export function quiltPackage({
  react: useReact = true,
  css: useCss = false,
}: QuiltPackageOptions = {}) {
  const preact = useReact === 'preact';

  return createComposedProjectPlugin<Package>('Quilt.Package', [
    javascript(),
    typescript(),
    useReact && react({preact}),
    preact && preactAliases(),
    useCss && css(),
  ]);
}

export interface QuiltWebAppOptions {
  readonly preact?: boolean;
  readonly autoServer?:
    | boolean
    | NonNullable<Parameters<typeof webAppAutoServer>[0]>;
  readonly cdn?: string;
  readonly assetServer?: NonNullable<
    Parameters<typeof webpackDevWebApp>[0]
  >['assetServer'];
  readonly graphql?: {
    readonly export?: ExportStyle;
  };
  readonly browserGroups?: NonNullable<
    Parameters<typeof webAppMultiBuilds>[0]
  >['browserGroups'];
  readonly features?: PolyfillFeature[];
}

export function quiltWebApp({
  assetServer,
  preact,
  autoServer = false,
  cdn: cdnUrl,
  graphql: {export: exportStyle = 'simple'} = {},
  browserGroups,
  features,
}: QuiltWebAppOptions = {}) {
  return createComposedProjectPlugin<WebApp>(
    'Quilt.WebApp',
    async (composer) => {
      composer.use(
        javascript(),
        typescript(),
        css(),
        webpackHooks(),
        webAppMultiBuilds({babel: true, postcss: true, browserGroups}),
        webpackDevWebApp({assetServer}),
        webpackBuild(),
        flexibleOutputs(),
        brotli(),
        polyfills({features}),
        react({preact}),
        graphql({export: exportStyle}),
        webAppConvenienceAliases(),
        webAppMagicModules(),
        webAppBrowserEntry({hydrate: ({task}) => task !== Task.Dev}),
        preact && preactAliases(),
        autoServer &&
          webAppAutoServer(typeof autoServer === 'object' ? autoServer : {}),
        cdnUrl ? cdn({url: cdnUrl}) : false,
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
  readonly cdn?: string;
  readonly devServer?: NonNullable<Parameters<typeof webpackDevService>[0]>;
}

export function quiltService({
  devServer,
  cdn: cdnUrl,
}: QuiltServiceOptions = {}) {
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
        webpackBuild(),
        webpackDevService(devServer),
        polyfills(),
        cdnUrl ? cdn({url: cdnUrl}) : false,
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
  readonly css?: boolean;
  readonly graphql?: boolean;
  readonly stylelint?: boolean | Parameters<typeof stylelint>[0];
}

export function quiltWorkspace({
  css = true,
  stylelint: stylelintOptions = css,
  graphql = true,
}: QuiltWorkspaceOptions = {}) {
  return createComposedWorkspacePlugin('Quilt.Workspace', async (composer) => {
    composer.use(jest(), eslint(), workspaceTypeScript(), workspaceGraphQL());

    if (stylelintOptions) {
      composer.use(
        stylelint(
          typeof stylelintOptions === 'boolean' ? undefined : stylelintOptions,
        ),
      );
    }

    if (graphql) {
      await ignoreMissingImports(async () => {
        const {graphql} = await import('@quilted/graphql/sewing-kit');
        composer.use(graphql());
      });
    }
  });
}

async function ignoreMissingImports<T>(perform: () => Promise<T>) {
  try {
    await perform();
  } catch {
    // intentional noop
  }
}
