import {
  multiline,
  MAGIC_MODULE_HONO,
  type AppRuntime,
  type ServerRuntime,
} from '@quilted/rollup';

export function cloudflareWorkers() {
  return {
    output: {
      bundle: true,
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

const DEFAULT_HEADERS = {
  '/assets/*': ['Cache-Control: public, max-age=31536000, immutable'],
};

export function cloudflareWorkersApp({
  assets,
}: {
  assets?: {
    headers?: Record<string, readonly string[]>;
  };
}) {
  return {
    assets: {
      directory: './build/public/assets',
    },
    server: cloudflareWorkers(),
    browser: {
      rollup() {
        return {
          name: '@quilted/cloudflare/rollup/headers',
          async generateBundle() {
            const {writeFile} = await import('node:fs/promises');

            const content = Object.entries(assets?.headers ?? DEFAULT_HEADERS)
              .map(([path, headers]) => {
                return `${path}\n  ${headers.join('\n  ')}`;
              })
              .join('\n');

            await writeFile('./build/public/_headers', content);
          },
        };
      },
    },
  } satisfies AppRuntime;
}
