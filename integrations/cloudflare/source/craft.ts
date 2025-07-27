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

export function cloudflareWorkersApp() {
  return {
    assets: {
      directory: 'build/public/assets',
    },
    server: cloudflareWorkers(),
  } satisfies AppRuntime;
}
