import {
  multiline,
  MAGIC_MODULE_HONO,
  type ServerRuntime,
} from '@quilted/rollup';

export interface DenoRuntimeOptions {
  /**
   * The port that the server will listen on when it runs.
   *
   * If you do not provide a value, the server will listen for
   * requests on the port specified by `Deno.env.get('PORT')`.
   */
  port?: number | string;

  /**
   * The host that the server will listen on when it runs.
   */
  host?: string;
}

export function deno({port, host}: DenoRuntimeOptions) {
  return {
    env: 'Deno.env.toObject()',
    hono() {
      return multiline`
        import app from ${JSON.stringify(MAGIC_MODULE_HONO)};

        const port = ${
          port ?? `Number.parseInt(Deno.env.get('PORT') ?? '8080', 10)`
        };
        const hostname = ${host ? JSON.stringify(host) : 'undefined'};

        Deno.serve({port, hostname}, app.fetch);
      `;
    },
  } satisfies ServerRuntime;
}
