import {extname} from 'path';
import {stripIndent} from 'common-tags';

import {MAGIC_MODULE_HTTP_HANDLER} from '@quilted/craft';
import {
  createProjectPlugin,
  ProjectKind,
  WaterfallHook,
} from '@quilted/craft/kit';
import type {
  App,
  Service,
  ResolvedHooks,
  ResolvedOptions,
  BuildAppOptions,
  BuildServiceOptions,
  BuildAppConfigurationHooks,
  BuildServiceConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '@quilted/craft/kit';
import type {MiniflareOptions} from 'miniflare';

export type WorkerFormat = 'modules' | 'service-worker';

export interface Options {
  /**
   * Controls whether the auto-generated server will also serve
   * static assets hosted on Cloudflare Sites. This is `true` by
   * default for applications.
   *
   * To make use of the asset server, you’ll need to update your
   * Wrangler configuration to upload the browser assets Quilt creates.
   */
  serveAssets?: boolean;

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
  interface DevelopAppConfigurationHooks extends CloudflareDevelopHooks {}
  interface DevelopServiceConfigurationHooks extends CloudflareDevelopHooks {}
}

/**
 * Configures any server-side code generated for this project to
 * run on Cloudflare Workers.
 */
export function cloudflareWorkers({
  format = 'modules',
  cache = true,
  serveAssets,
  miniflare: useMiniflare = true,
}: Options = {}) {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.Cloudflare.Workers',
    build({project, configure}) {
      configure(
        addConfiguration({
          cache,
          format,
          serveAssets: serveAssets ?? project.kind === ProjectKind.App,
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
        serveAssets: false,
      });

      configure((hooks, options) => {
        addBaseConfiguration(hooks, options);

        const {quiltAppDevelopmentServer, miniflareOptions} =
          hooks as ResolvedDevelopProjectConfigurationHooks<App>;

        if (!useMiniflare) return;

        quiltAppDevelopmentServer?.(async () => {
          const [{Miniflare}, {response}] = await Promise.all([
            import('miniflare'),
            import('@quilted/quilt/http-handlers'),
          ]);

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
                async run({url, body, headers, method}, nodeRequest) {
                  const workerResponse = await miniflare!.dispatchFetch(
                    url.toString(),
                    {
                      body:
                        method === 'GET' || method === 'OPTIONS'
                          ? undefined
                          : body,
                      method,
                      headers,
                      cf: (await HTTPPlugin.getRequestMeta(nodeRequest)).cf,
                    },
                  );

                  return response(await workerResponse.text(), {
                    status: workerResponse.status,
                    headers: [...workerResponse.headers],
                  });
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
  format,
  serveAssets,
}: {
  cache: boolean;
  format: WorkerFormat;
  serveAssets: boolean;
}) {
  return (
    {
      rollupOutputs,
      rollupNodeBundle,
      quiltAssetBaseUrl,
      quiltServiceOutputFormat,
      quiltAppServerOutputFormat,
      quiltHttpHandlerRuntimeContent,
      quiltPolyfillFeatures,
      quiltRuntimeEnvironmentVariables,
    }: ResolvedHooks<
      BuildAppConfigurationHooks & BuildServiceConfigurationHooks
    >,
    options: ResolvedOptions<BuildAppOptions & BuildServiceOptions>,
  ) => {
    if (
      !(options as ResolvedOptions<BuildAppOptions>).quiltAppServer &&
      !(options as ResolvedOptions<BuildServiceOptions>).quiltService
    ) {
      return;
    }

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

    quiltPolyfillFeatures?.((features) => {
      // Workers support fetch natively.
      return features.filter((feature) => feature !== 'fetch');
    });

    rollupOutputs?.((outputs) => {
      for (const output of outputs) {
        if (format === 'modules') {
          // Cloudflare workers assume .js/.cjs are commonjs by default,
          // if we are using modules we default file names to .mjs so they
          // are automatically interpreted as modules.
          output.entryFileNames = ensureMjsExtension(output.entryFileNames);
          output.chunkFileNames = ensureMjsExtension(output.chunkFileNames);
          output.assetFileNames = ensureMjsExtension(output.assetFileNames);
        }
      }

      return outputs;
    });

    if (format === 'modules') {
      quiltHttpHandlerRuntimeContent?.(
        async () => stripIndent`
          import HttpHandler from ${JSON.stringify(MAGIC_MODULE_HTTP_HANDLER)};

          import {createFetchHandler} from '@quilted/cloudflare/http-handlers';

          const handler = createFetchHandler(HttpHandler, {
            cache: ${String(cache)},
            assets: ${
              serveAssets
                ? JSON.stringify({
                    path: await quiltAssetBaseUrl!.run(),
                  })
                : 'false'
            }
          });

          export default {
            fetch: handler,
          }
        `,
      );
    } else {
      quiltHttpHandlerRuntimeContent?.(
        async () => stripIndent`
          import HttpHandler from ${JSON.stringify(MAGIC_MODULE_HTTP_HANDLER)};

          import {createFetchHandler, transformFetchEvent} from '@quilted/cloudflare/http-handlers';

          const handler = createRequestHandler(HttpHandler, {
            cache: ${String(cache)},
            assets: ${
              serveAssets
                ? JSON.stringify({
                    path: await quiltAssetBaseUrl!.run(),
                  })
                : 'false'
            }
          });

          addEventListener('fetch', (event) => {
            event.respondWith(
              handler(...transformFetchEvent(event)),
            );
          });
        `,
      );
    }
  };
}

function ensureMjsExtension<T>(file?: T) {
  if (typeof file !== 'string') return file;
  const extension = extname(file);
  return `${file.slice(0, file.length - extension.length)}.mjs`;
}
