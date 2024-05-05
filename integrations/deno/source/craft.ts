import {
  multiline,
  MAGIC_MODULE_REQUEST_ROUTER,
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
    requestRouter() {
      return multiline`
        import {createServeHandler} from '@quilted/deno/request-router';
        import router from ${JSON.stringify(MAGIC_MODULE_REQUEST_ROUTER)};

        const port = ${
          port ?? `Number.parseInt(Deno.env.get('PORT') ?? '8080', 10)`
        };
        const hostname = ${host ? JSON.stringify(host) : 'undefined'};
        const handleRequest = createServeHandler(router);

        Deno.serve({port, hostname}, handleRequest);
      `;
    },
  } satisfies ServerRuntime;
}
