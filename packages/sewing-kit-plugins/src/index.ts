import {
  Package,
  Service,
  WebApp,
  createProjectPlugin,
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
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

export function quiltPackage({react: useReact = true} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.Package', [
    javascript(),
    typescript(),
    useReact && react(),
  ]);
}

export interface QuiltWebAppOptions {
  readonly preact?: boolean;
  readonly assetServer?: NonNullable<
    Parameters<typeof webpackDevWebApp>[0]
  >['assetServer'];
  readonly graphql?: {
    readonly export?: ExportStyle;
  };
}

export function quiltWebApp({
  assetServer,
  preact,
  graphql: {export: exportStyle = 'simple'} = {},
}: QuiltWebAppOptions = {}) {
  return createComposedProjectPlugin<WebApp>(
    'Quilt.WebApp',
    async (composer) => {
      composer.use(
        javascript(),
        typescript(),
        css(),
        webpackHooks(),
        webpackDevWebApp({assetServer}),
        flexibleOutputs(),
        webpackBuild(),
        react({preact}),
        graphql({export: exportStyle}),
        webAppConvenienceAliases(),
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

function webAppConvenienceAliases() {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppConvenienceAliases',
    ({project, tasks: {dev, build, test}}) => {
      dev.hook(({hooks}) => {
        hooks.configure.hook((configure) => {
          configure.webpackAliases?.hook(addWebpackAliases);
        });
      });

      build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook((configuration) => {
            configuration.webpackAliases?.hook(addWebpackAliases);
          });
        });
      });

      test.hook(({hooks}) => {
        hooks.configure.hook((configure) => {
          configure.jestModuleMapper?.hook((moduleMapper) => ({
            ...moduleMapper,
            '^components': project.fs.resolvePath('components'),
            '^utilities/(.*)': project.fs.resolvePath('utilities/$1'),
            '^tests/(.*)': project.fs.resolvePath('tests/$1'),
          }));
        });
      });

      function addWebpackAliases(aliases: {[key: string]: string}) {
        return {
          ...aliases,
          components$: project.fs.resolvePath('components'),
          utilities: project.fs.resolvePath('utilities'),
        };
      }
    },
  );
}

export interface QuiltServiceOptions {
  readonly devServer?: NonNullable<Parameters<typeof webpackDevService>[0]>;
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
        webpackBuild(),
        webpackDevService(devServer),
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
  readonly stylelint?: boolean | Parameters<typeof stylelint>[0];
}

export function quiltWorkspace({
  css = true,
  stylelint: stylelintOptions = css,
}: QuiltWorkspaceOptions = {}) {
  return createComposedWorkspacePlugin('Quilt.Workspace', (composer) => {
    composer.use(jest(), eslint(), workspaceTypeScript(), workspaceGraphQL());

    if (stylelintOptions) {
      composer.use(
        stylelint(
          typeof stylelintOptions === 'boolean' ? undefined : stylelintOptions,
        ),
      );
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
