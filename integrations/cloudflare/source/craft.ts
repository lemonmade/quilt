import {
  multiline,
  MAGIC_MODULE_REQUEST_ROUTER,
  type AppRuntime,
  type ServerRuntime,
} from '@quilted/craft/rollup';

export type WorkerFormat = 'module' | 'service-worker';

export interface RuntimeOptions {
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
}

export function cloudflareWorkers({
  cache,
  format = 'module',
}: RuntimeOptions = {}) {
  return {
    env: environmentForFormat(format),
    output: {
      bundle: true,
      options: {
        format: format === 'module' ? 'esm' : 'iife',
      },
    },
    requestRouter() {
      if (format === 'module') {
        return multiline`
          import {createFetchHandler} from '@quilted/cloudflare/request-router';
          import router from ${JSON.stringify(MAGIC_MODULE_REQUEST_ROUTER)};

          const fetch = createFetchHandler(router, {
            cache: ${String(cache)},
          });

          export default {fetch};
        `;
      } else {
        return multiline`
          import {createFetchHandler, transformFetchEvent} from '@quilted/cloudflare/request-router';
          import router from ${JSON.stringify(MAGIC_MODULE_REQUEST_ROUTER)};

          const fetch = createFetchHandler(router, {
            cache: ${String(cache)},
          });

          addEventListener('fetch', (event) => {
            event.respondWith(
              fetch(...transformFetchEvent(event)),
            );
          });
        `;
      }
    },
  } satisfies ServerRuntime;
}

export function cloudflarePages({
  cache,
  format = 'module',
}: RuntimeOptions = {}) {
  return {
    assets: {
      directory: 'build/public',
    },
    server: cloudflarePagesServer({cache, format}),
  } satisfies AppRuntime;
}

function cloudflarePagesServer({
  cache,
  format = 'module',
}: RuntimeOptions = {}) {
  return {
    env: environmentForFormat(format),
    output: {
      bundle: true,
      directory: 'build/public',
      options: {
        format: format === 'module' ? 'esm' : 'iife',
        inlineDynamicImports: true,
        entryFileNames: '_worker.js',
      },
    },
    requestRouter() {
      if (format === 'module') {
        return multiline`
          import {createFetchHandler} from '@quilted/cloudflare/request-router';
          import router from ${JSON.stringify(MAGIC_MODULE_REQUEST_ROUTER)};

          const fetch = createFetchHandler(router, {
            cache: ${String(cache)},
          });

          export default {fetch};
        `;
      } else {
        return multiline`
          import {createFetchHandler, transformFetchEvent} from '@quilted/cloudflare/request-router';
          import router from ${JSON.stringify(MAGIC_MODULE_REQUEST_ROUTER)};

          const fetch = createFetchHandler(router, {
            cache: ${String(cache)},
          });

          addEventListener('fetch', (event) => {
            event.respondWith(
              fetch(...transformFetchEvent(event)),
            );
          });
        `;
      }
    },
  } satisfies ServerRuntime;
}

function environmentForFormat(format: WorkerFormat) {
  return format === 'service-worker'
    ? `new Proxy({}, {get: (_, property) => Reflect.get(globalThis, property)})`
    : undefined;
}
