import {stripIndent} from 'common-tags';

import {addRollupNodeBundleInclusion} from '../tools/rollup';
import type {RollupNodeBundle} from '../tools/rollup';

import {
  MAGIC_MODULE_APP_ASSET_MANIFEST,
  MAGIC_MODULE_APP_COMPONENT,
} from '../constants';
import {createProjectPlugin} from '../kit';
import type {
  Project,
  ResolvedOptions,
  BuildProjectOptions,
  ResolvedBuildProjectConfigurationHooks,
} from '../kit';

import type {EnvironmentOptions} from './magic-module-env';

export interface AppServerOptions {
  /**
   * The relative path to the module you want to use as the
   * entry for your app server. When provided, this completely
   * overwrites the default server content.
   *
   * @example './server.tsx'
   */
  entry?: string;

  /**
   * Whether this server code uses the `request-router` library to
   * define itself in a generic way, which can be adapted to a variety
   * of environments. By default, this is `'request-router'`, and when `'request-router'`,
   * the `entry` you specified must export an `RequestRouter` object as
   * its default export. When set to `false`, the app server will be built
   * as a basic server-side JavaScript project, without the special
   * `request-router` adaptor.
   *
   * @default 'request-router'
   */
  format?: 'request-router' | 'custom';

  /**
   * Whether the automatic server will serve assets for the browser build.
   * If this is `true`, you must ensure that your assets are stored in an
   * `assets` directory that is a sibling to the `server` directory that
   * will contain your server files. This is done automatically for you
   * with the default configuration applied by Quilt.
   *
   * @default true
   */
  serveAssets?: boolean;

  /**
   * Controls how the app server exposes environment variables.
   */
  env?: EnvironmentOptions;

  /**
   * Determines how dependencies will be bundled into your app server.
   * By default, Quilt will bundle all dev dependencies in your build
   * outputs, but will leave production dependencies and node built-in
   * modules as runtime dependencies. You can change this behavior by
   * passing `true`, which will force all dependencies to be bundled,
   * or by passing an object with granular controls on what dependencies
   * are bundled.
   */
  bundle?: boolean | RollupNodeBundle;
}

export interface AppServerConfigurationOptions {
  /**
   * Indicates that the app server build is being generated by Quilt.
   */
  quiltAppServer: boolean;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions extends AppServerConfigurationOptions {}
  interface DevelopProjectOptions extends AppServerConfigurationOptions {}
}

const MAGIC_CUSTOM_SERVER_ENTRY_MODULE = '__quilt__/CustomAppServer';

export function appServer(options?: AppServerOptions) {
  return createProjectPlugin({
    name: 'Quilt.App.Server',
    build({project, configure}) {
      configure(setupConfiguration(project, options));
    },
    develop({project, configure}) {
      configure(setupConfiguration(project, options) as any);
    },
  });
}

function setupConfiguration(
  project: Project,
  {
    env,
    entry,
    format = 'request-router',
    bundle: explicitBundle,
  }: AppServerOptions = {},
) {
  const requestRouter = format === 'request-router';
  const inlineEnv = env?.inline;

  return (
    {
      runtimes,
      postcssPlugins,
      postcssProcessOptions,
      postcssCSSModulesOptions,
      rollupInput,
      rollupPlugins,
      rollupNodeBundle,
      quiltAppServerEntryContent,
      quiltRequestRouterContent,
      quiltAsyncPreload,
      quiltAsyncManifest,
      quiltInlineEnvironmentVariables,
      quiltRuntimeEnvironmentVariables,
    }: ResolvedBuildProjectConfigurationHooks,
    {quiltAppServer = false}: ResolvedOptions<BuildProjectOptions>,
  ) => {
    if (!quiltAppServer) return;

    if (inlineEnv != null && inlineEnv.length > 0) {
      quiltInlineEnvironmentVariables?.((variables) =>
        Array.from(new Set([...variables, ...inlineEnv])),
      );
    }

    quiltRuntimeEnvironmentVariables?.((runtime) => runtime ?? 'process.env');

    runtimes(() => [{target: 'node'}]);

    const content = entry
      ? requestRouter
        ? stripIndent`
          export {default} from ${JSON.stringify(
            project.fs.resolvePath(entry),
          )};
        `
        : stripIndent`
          import ${JSON.stringify(project.fs.resolvePath(entry))};
        `
      : stripIndent`
        import '@quilted/quilt/global';
        import {jsx} from 'react/jsx-runtime';
        import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
        import {createAssetManifest} from ${JSON.stringify(
          MAGIC_MODULE_APP_ASSET_MANIFEST,
        )};
        import {createServerRender} from '@quilted/quilt/server';
  
        export default createServerRender(() => jsx(App), {
          assets: createAssetManifest(),
        });
      `;

    quiltAsyncPreload?.(() => false);
    quiltAsyncManifest?.(() => false);

    // We want to force some of our “magic” modules to be internalized
    // no matter what, and other wise defer to the user-specified or
    // fallback behavior.
    rollupNodeBundle?.((defaultBundle) => {
      return addRollupNodeBundleInclusion(
        /@quilted[/]quilt[/](magic|env)/,
        explicitBundle ?? defaultBundle,
      );
    });

    rollupPlugins?.(async (plugins) => {
      const {cssRollupPlugin} = await import('./rollup/css');

      plugins.push(
        cssRollupPlugin({
          extract: false,
          postcssPlugins: () => postcssPlugins!.run(),
          postcssProcessOptions: () => postcssProcessOptions!.run(),
          postcssCSSModulesOptions: (options) =>
            postcssCSSModulesOptions!.run(options),
        }),
      );

      return plugins;
    });

    if (requestRouter) {
      quiltRequestRouterContent?.(
        async () => await quiltAppServerEntryContent!.run(content),
      );
    } else {
      rollupInput?.(() => [MAGIC_CUSTOM_SERVER_ENTRY_MODULE]);
    }
  };
}
