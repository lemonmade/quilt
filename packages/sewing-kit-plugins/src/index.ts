import {
  Package,
  Service,
  WebApp,
  createComposedWorkspacePlugin,
  createComposedProjectPlugin,
  Task,
} from '@sewing-kit/plugins';

import {eslint} from '@sewing-kit/plugin-eslint';
import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript, workspaceTypeScript} from '@sewing-kit/plugin-typescript';
import {css} from '@sewing-kit/plugin-css';
import {stylelint} from '@sewing-kit/plugin-stylelint';
import {jest} from '@sewing-kit/plugin-jest';
import {rollupHooks, rollupBuild} from '@sewing-kit/plugin-rollup';

import {httpHandler, httpHandlerDevelopment} from './http-handler';
import {polyfills} from './polyfills';
import {react} from './react-mini';
import {
  rollupBaseConfiguration,
  rollupBaseWorkerConfiguration,
} from './rollup-base';
import {webAppAutoServer} from './web-app-auto-server';
import {webAppBrowserEntry} from './web-app-browser-entry';
import {webAppMagicModules} from './web-app-magic-modules';
import {webAppMultiBuilds} from './web-app-multi-build';
import {webAppConvenienceAliases} from './web-app-convenience-aliases';

/* eslint-disable prettier/prettier */
export type {} from './http-handler';
export type {} from './web-app-auto-server';
/* eslint-enable prettier/prettier */

export {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_HTTP_HANDLER,
  MAGIC_MODULE_APP_ASSET_MANIFEST,
} from './constants';

export interface QuiltPackageOptions {
  readonly css?: boolean;
  readonly react?: boolean | NonNullable<Parameters<typeof react>[0]>;
}

export function quiltPackage({
  css: useCss = false,
  react: useReact = true,
}: QuiltPackageOptions = {}) {
  return createComposedProjectPlugin<Package>('Quilt.Package', [
    javascript(),
    typescript(),
    useReact && react(typeof useReact === 'boolean' ? undefined : useReact),
    useCss && css(),
  ]);
}

export interface QuiltWebAppOptions {
  readonly autoServer?:
    | boolean
    | NonNullable<Parameters<typeof webAppAutoServer>[0]>;
  readonly cdn?: string;
  readonly browserGroups?: NonNullable<
    Parameters<typeof webAppMultiBuilds>[0]
  >['browserGroups'];
  readonly polyfill?: boolean | NonNullable<Parameters<typeof polyfills>[0]>;
  readonly react?: NonNullable<Parameters<typeof react>[0]>;
}

export function quiltWebApp({
  react: reactOptions,
  autoServer = false,
  cdn: cdnUrl,
  browserGroups,
  polyfill = autoServer ? {features: ['base', 'fetch']} : true,
}: QuiltWebAppOptions = {}) {
  return createComposedProjectPlugin<WebApp>(
    'Quilt.WebApp',
    async (composer) => {
      composer.use(
        rollupHooks(),
        javascript(),
        typescript(),
        css(),
        react(reactOptions),
        polyfill &&
          polyfills(typeof polyfill === 'boolean' ? undefined : polyfill),
        rollupBaseConfiguration(),
        rollupBuild(),
        webAppMagicModules(),
        webAppConvenienceAliases(),
        webAppBrowserEntry({hydrate: ({task}) => task !== Task.Dev}),
        webAppMultiBuilds({babel: true, postcss: true, browserGroups}),
        autoServer && httpHandler(),
        autoServer &&
          webAppAutoServer(
            typeof autoServer === 'boolean' ? undefined : autoServer,
          ),
        // cdnUrl ? cdn({url: cdnUrl}) : false,
      );

      const optionalPlugins = await Promise.all([
        ignoreMissingImports(async () => {
          const {graphql} = await import('@quilted/graphql/sewing-kit');

          return graphql();
        }),
        ignoreMissingImports(async () => {
          const {workers} = await import('@quilted/workers/sewing-kit');

          return createComposedProjectPlugin('Quilt.Workers', [
            workers({
              publicPath: cdnUrl,
            }),
            rollupBaseWorkerConfiguration(),
          ]);
        }),
        ignoreMissingImports(async () => {
          const {asyncQuilt} = await import('@quilted/async/sewing-kit');

          return asyncQuilt({
            moduleSystem: ({task}) =>
              task === Task.Build ? 'systemjs' : undefined,
          });
        }),
      ]);

      composer.use(...optionalPlugins);
    },
  );
}

export interface QuiltServiceOptions {
  readonly cdn?: string;
  readonly build?: boolean;
  readonly react?: boolean | NonNullable<Parameters<typeof react>[0]>;
  readonly develop?:
    | boolean
    | Pick<NonNullable<Parameters<typeof httpHandlerDevelopment>[0]>, 'port'>;
  readonly httpHandler?:
    | boolean
    | Pick<NonNullable<Parameters<typeof httpHandler>[0]>, 'port'>;
  readonly polyfill?: boolean | NonNullable<Parameters<typeof polyfills>[0]>;
}

export function quiltService({
  develop = true,
  build = true,
  react: useReact = false,
  // cdn: cdnUrl,
  httpHandler: useHttpHandler = true,
  polyfill = useHttpHandler ? {features: ['base', 'fetch']} : true,
}: QuiltServiceOptions = {}) {
  return createComposedProjectPlugin<Service>(
    'Quilt.Service',
    async (composer) => {
      composer.use(
        rollupHooks(),
        javascript(),
        typescript(),
        // eslint-disable-next-line no-warning-comments
        // TODO: need to add rollup configuration for CSS in a service...
        css(),
        rollupBaseConfiguration(),
        useReact && react(typeof useReact === 'boolean' ? undefined : useReact),
        polyfill &&
          polyfills(typeof polyfill === 'boolean' ? undefined : polyfill),
        // cdnUrl ? cdn({url: cdnUrl}) : false,
        useHttpHandler &&
          httpHandler(
            typeof useHttpHandler === 'boolean' ? undefined : useHttpHandler,
          ),
        build && rollupBuild(),
        develop &&
          httpHandlerDevelopment(
            typeof develop === 'boolean' ? undefined : develop,
          ),
      );

      const optionalPlugins = await Promise.all([
        ignoreMissingImports(async () => {
          const {graphql} = await import('@quilted/graphql/sewing-kit');

          return graphql();
        }),
      ]);

      composer.use(...optionalPlugins);
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
  return createComposedWorkspacePlugin('Quilt.Workspace', async (composer) => {
    composer.use(
      jest(),
      eslint(),
      workspaceTypeScript(),
      stylelintOptions &&
        stylelint(
          typeof stylelintOptions === 'boolean' ? undefined : stylelintOptions,
        ),
    );

    const optionalPlugins = await Promise.all([
      ignoreMissingImports(async () => {
        const {workspaceGraphQL} = await import('@quilted/graphql/sewing-kit');

        return workspaceGraphQL();
      }),
    ]);

    composer.use(...optionalPlugins);
  });
}

async function ignoreMissingImports<T>(perform: () => Promise<T>) {
  try {
    const result = await perform();
    return result;
  } catch {
    // intentional noop
  }
}
