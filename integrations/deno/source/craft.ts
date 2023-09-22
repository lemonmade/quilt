import {stripIndent} from 'common-tags';

import {createProjectPlugin, MAGIC_MODULE_REQUEST_ROUTER} from '@quilted/craft';
import type {
  Project,
  BuildProjectOptions,
  DevelopProjectOptions,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '@quilted/craft/kit';
import type {PolyfillFeature} from '@quilted/craft/polyfills';
import type {} from '@quilted/craft/browserslist';

export interface Options {}

export interface DenoDevelopHooks {}

declare module '@quilted/craft/kit' {
  interface DevelopProjectConfigurationHooks extends DenoDevelopHooks {}
}

/**
 * Configures any code generated for this project to run on Deno.
 */
export function deno(_: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Deno',
    build({project, configure}) {
      configure(
        addConfiguration({
          project,
          mode: 'production',
        }),
      );
    },
    // develop({project, configure, hooks}) {
    //   hooks<DenoDevelopHooks>(() => ({}));

    //   configure(
    //     addConfiguration({
    //       project,
    //       mode: 'development',
    //     }),
    //   );
    // },
  });
}

function addConfiguration({mode}: {mode: string; project: Project}) {
  return (
    {
      runtimes,
      browserslistTargets,
      rollupPlugins,
      rollupNodeBundle,
      quiltRequestRouterPort,
      quiltRequestRouterHost,
      quiltServiceOutputFormat,
      quiltAppServerOutputFormat,
      quiltRequestRouterRuntimeContent,
      quiltPolyfillFeaturesForEnvironment,
      quiltRuntimeEnvironmentVariables,
    }: Partial<
      ResolvedBuildProjectConfigurationHooks &
        ResolvedDevelopProjectConfigurationHooks
    >,
    options: Partial<BuildProjectOptions & DevelopProjectOptions>,
  ) => {
    if (!options.quiltAppServer && !options.quiltService) {
      return;
    }

    runtimes?.(() => [{target: 'deno'}]);

    browserslistTargets?.(() => ['last 1 chrome version']);

    rollupPlugins?.(async (plugins) => {
      const {rollupReplaceProcessEnv} = await import('@quilted/craft/rollup');

      return [
        ...plugins,
        await rollupReplaceProcessEnv({mode, preserve: false}),
      ];
    });

    rollupNodeBundle?.(() => true);

    quiltRuntimeEnvironmentVariables?.(() => `Deno.env.toObject()`);

    quiltServiceOutputFormat?.(() => 'module');
    quiltAppServerOutputFormat?.(() => 'module');

    const polyfillsWithNativeWorkersSupport = new Set<PolyfillFeature>([
      'crypto',
      'fetch',
      'abort-controller',
    ]);

    quiltPolyfillFeaturesForEnvironment?.((features) => {
      return features.filter(
        (feature) => !polyfillsWithNativeWorkersSupport.has(feature),
      );
    });

    // @see https://deno.land/api@v1.37.0?s=Deno.ServeOptions
    quiltRequestRouterRuntimeContent?.(async () => {
      const [port, host] = await Promise.all([
        quiltRequestRouterPort!.run(undefined),
        quiltRequestRouterHost!.run(undefined),
      ]);

      return stripIndent`
        import {createServeHandler} from '@quilted/deno/request-router';
        import RequestRouter from ${JSON.stringify(
          MAGIC_MODULE_REQUEST_ROUTER,
        )};

        const port = ${
          port ?? `Number.parseInt(Deno.env.get('PORT') ?? '8080', 10)`
        };
        const hostname = ${host ? JSON.stringify(host) : 'undefined'};
        const handleRequest = createServeHandler(RequestRouter);

        Deno.serve({port, hostname}, handleRequest);
      `;
    });
  };
}
