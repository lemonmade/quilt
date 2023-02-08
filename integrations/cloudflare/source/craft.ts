import * as path from 'path';
import {stripIndent} from 'common-tags';

import {createProjectPlugin, MAGIC_MODULE_REQUEST_ROUTER} from '@quilted/craft';
import type {
  Project,
  WaterfallHook,
  BuildProjectOptions,
  DevelopProjectOptions,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '@quilted/craft/kit';
import type {PolyfillFeature} from '@quilted/craft/polyfills';
import type {} from '@quilted/craft/browserslist';
import type {MiniflareOptions} from 'miniflare';

export type WorkerFormat = 'modules' | 'service-worker';

export interface Options {
  /**
   * Controls whether the built application server will be run on
   * Cloudflare Pages. When set to `true`, Quilt will do the following:
   *
   * - Your app’s assets will be generated into the `public/assets`
   *   folder in your build directory
   * - Your app’s server will be generated into `public/_worker.js`,
   *   in order for Cloudflare to use it for all requests
   * - Your app’s server will use Cloudflare Pages APIs to serve
   *   the static assets generated at build time.
   *
   * @see https://developers.cloudflare.com/pages/
   * @default false
   */
  pages?: boolean;

  /**
   * Whether the resulting request handler will use the Cloudflare cache
   * for responses. When set to `true`, which is the default, the request
   * handler will check the cache for all incoming requests, and respond
   * with the cache result if found. You can use the `cache-control` header
   * (typically by using the `CacheControl` component and `useCacheControl`
   * hooks from `@quilted/quilt/http`) to customize the cache duration of
   * responses.
   *
   * Note that, if you are using the `serveAssets` feature to serve static
   * assets from a server-side rendered application, the static assets always
   * use the Cloudflare cache, regardless of this setting.
   */
  cache?: boolean;

  /**
   * The format to output your Worker in. By default, the newer `modules`
   * format is used, but you can pass `format: 'service-worker'` to target
   * the service worker APIs instead.
   *
   * @see https://developers.cloudflare.com/workers/cli-wrangler/configuration#build
   */
  format?: WorkerFormat;

  /**
   * Configures how miniflare is used during development. By default, miniflare
   * is used to run your compiled workers with smart default configuration options.
   * You can pass `miniflare: false` to disable miniflare entirely, or pass any
   * subset of miniflare’s options.
   *
   * @see https://miniflare.dev/get-started/api#reference
   */
  miniflare?: boolean | MiniflareOptions;
}

export interface CloudflareDevelopHooks {
  miniflareOptions?: WaterfallHook<MiniflareOptions>;
}

declare module '@quilted/craft/kit' {
  interface DevelopProjectConfigurationHooks extends CloudflareDevelopHooks {}
}

/**
 * Configures any server-side code generated for this project to
 * run on Cloudflare Workers.
 */
export function cloudflareWorkers({
  format = 'modules',
  cache = false,
  pages = false,
  miniflare: useMiniflare = true,
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Cloudflare.Workers',
    build({project, configure}) {
      configure(
        addConfiguration({
          cache,
          format,
          pages,
          project,
        }),
      );
    },
    develop({project, configure, hooks}) {
      hooks<CloudflareDevelopHooks>(({waterfall}) => ({
        miniflareOptions: waterfall(),
      }));

      const addBaseConfiguration = addConfiguration({
        cache,
        format,
        pages: false,
        project,
      });

      configure((hooks, options) => {
        addBaseConfiguration(hooks, options);

        const {quiltAppDevelopmentServer, miniflareOptions} = hooks;

        if (!useMiniflare) return;

        quiltAppDevelopmentServer?.(async () => {
          const {Miniflare} = await import('miniflare');

          let miniflare: InstanceType<typeof Miniflare>;

          return {
            async rebuild(entry) {
              miniflare ??= new Miniflare(
                await miniflareOptions!.run({
                  watch: true,
                  modules: true,
                  scriptPath: entry,
                  packagePath: project.fs.resolvePath('package.json'),
                  wranglerConfigPath: (await project.fs.hasFile(
                    'wrangler.toml',
                  ))
                    ? project.fs.resolvePath('wrangler.toml')
                    : true,
                  // TODO: would be nice to have a clean flow for running this
                  // without the cached geolocation data.
                  cfFetch: true,
                  ...(typeof useMiniflare === 'boolean' ? {} : useMiniflare),
                }),
              );

              const {HTTPPlugin} = await miniflare.getPlugins();

              return {
                async fetch(request, nodeRequest) {
                  const workerResponse = await miniflare!.dispatchFetch(
                    request.url,
                    {
                      body: request.body as any,
                      method: request.method,
                      headers: request.headers,
                      cf: (await HTTPPlugin.getRequestMeta(nodeRequest)).cf,
                    },
                  );

                  return workerResponse as any;
                },
              };
            },
          };
        });
      });
    },
  });
}

function addConfiguration({
  cache,
  pages,
  format,
  project,
}: {
  cache: boolean;
  pages: boolean;
  format: WorkerFormat;
  project: Project;
}) {
  return (
    {
      runtimes,
      outputDirectory,
      browserslistTargets,
      rollupOutputs,
      rollupNodeBundle,
      quiltAssetBaseUrl,
      quiltAssetOutputRoot,
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
    if (options.quiltAppBrowser) {
      quiltAssetOutputRoot?.((currentRoot) =>
        currentRoot.startsWith('/') || currentRoot.startsWith('public/')
          ? currentRoot
          : `public/${currentRoot}`,
      );
    }

    if (!options.quiltAppServer && !options.quiltService) {
      return;
    }

    runtimes?.((runtimes) => [
      {target: 'worker'},
      ...runtimes.filter(
        (runtime) => runtime.target !== 'node' && runtime.target !== 'worker',
      ),
    ]);

    browserslistTargets?.(() => ['last 1 chrome version']);

    rollupNodeBundle?.(() => true);

    // Runtime variables are provided to the HTTP handler for module workers,
    // and are just properties on the global scope for non-module workers.
    if (format === 'modules') {
      quiltRuntimeEnvironmentVariables?.(() => undefined);
    } else {
      quiltRuntimeEnvironmentVariables?.(
        () =>
          `new Proxy({}, {get: (_, property) => Reflect.get(globalThis, property)})`,
      );
    }

    quiltServiceOutputFormat?.(() =>
      format === 'modules' ? 'module' : 'iife',
    );

    quiltAppServerOutputFormat?.(() =>
      format === 'modules' ? 'module' : 'iife',
    );

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

    if (pages) {
      // Pages want one, specific file in the output directory
      rollupOutputs?.(async (outputs) => {
        const [outputRoot] = await Promise.all([
          outputDirectory!.run(project.fs.buildPath()),
        ]);

        return outputs.map((output) => {
          return {
            ...output,
            dir: path.join(outputRoot, 'public'),
            inlineDynamicImports: true,
            entryFileNames: '_worker.js',
          };
        });
      });
    }

    if (format === 'modules') {
      quiltRequestRouterRuntimeContent?.(async () => {
        const handlerContent = pages
          ? stripIndent`
            import {createPagesFetchHandler} from '@quilted/cloudflare/request-router';

            const handler = createPagesFetchHandler(RequestRouter, {
              cache: ${String(cache)},
              assets: ${JSON.stringify({
                path: await quiltAssetBaseUrl!.run(),
              })}
            });
          `
          : stripIndent`
            import {createFetchHandler} from '@quilted/cloudflare/request-router';

            const handler = createFetchHandler(RequestRouter, {
              cache: ${String(cache)},
            });
          `;

        return stripIndent`
          import RequestRouter from ${JSON.stringify(
            MAGIC_MODULE_REQUEST_ROUTER,
          )};

          ${handlerContent}

          export default {
            fetch: handler,
          }
        `;
      });
    } else {
      quiltRequestRouterRuntimeContent?.(async () => {
        const handlerContent = pages
          ? stripIndent`
            import {createPagesFetchHandler, transformFetchEvent} from '@quilted/cloudflare/request-router';

            const handler = createPagesFetchHandler(RequestRouter, {
              cache: ${String(cache)},
              assets: ${JSON.stringify({
                path: await quiltAssetBaseUrl!.run(),
              })}
            });
          `
          : stripIndent`
            import {createFetchHandler, transformFetchEvent} from '@quilted/cloudflare/request-router';

            const handler = createFetchHandler(RequestRouter, {
              cache: ${String(cache)},
            });
          `;

        return stripIndent`
          import RequestRouter from ${JSON.stringify(
            MAGIC_MODULE_REQUEST_ROUTER,
          )};

          import {createFetchHandler, transformFetchEvent} from '@quilted/cloudflare/request-router';

          ${handlerContent}

          addEventListener('fetch', (event) => {
            event.respondWith(
              handler(...transformFetchEvent(event)),
            );
          });
        `;
      });
    }
  };
}
