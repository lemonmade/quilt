import {
  multiline,
  MAGIC_MODULE_HONO,
  type AppRuntime,
  type ServerRuntime,
} from '@quilted/rollup';

export function cloudflareWorkers() {
  return {
    output: {
      bundle: {
        exclude: ['cloudflare:workers'],
      },
    },
    resolve: {
      exportConditions: ['worker', 'workerd'],
    },
    hono() {
      return multiline`
        export {default} from ${JSON.stringify(MAGIC_MODULE_HONO)};
      `;
    },
  } satisfies ServerRuntime;
}

export function cloudflareWorkersApp({
  assets,
}: {
  assets?: {
    headers?: Record<string, readonly string[]>;
  };
} = {}) {
  return {
    assets: {
      directory: ({baseURL}) =>
        baseURL.startsWith('/')
          ? `./build/public/${baseURL.slice(1)}`
          : `./build/public/assets`,
    },
    server: cloudflareWorkers(),
    browser: {
      rollup(_, {assets: {baseURL}}) {
        return {
          name: '@quilted/cloudflare/rollup/headers',
          async writeBundle() {
            const {writeFile, mkdir} = await import('node:fs/promises');

            const headers = assets?.headers ?? defaultHeaders({baseURL});
            const headerEntries = Object.entries(headers);

            if (headerEntries.length === 0) {
              return;
            }

            const content =
              headerEntries
                .map(([path, headers]) => {
                  return `${path}\n  ${headers.join('\n  ')}`;
                })
                .join('\n') + '\n';

            await mkdir('./build/public', {recursive: true});
            await writeFile('./build/public/_headers', content);
          },
        };
      },
    },
  } satisfies AppRuntime;
}

function defaultHeaders({
  baseURL,
}: {
  baseURL: string;
}): Record<string, readonly string[]> {
  if (!baseURL.startsWith('/')) {
    return {};
  }

  return {
    [`${baseURL}${baseURL.endsWith('/') ? '' : '/'}*`]: [
      'Cache-Control: public, max-age=31536000, immutable',
    ],
  };
}
