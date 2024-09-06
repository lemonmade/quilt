import {callProcedure, type AnyTRPCRouter} from '@trpc/server';
import {observable} from '@trpc/server/observable';
import {
  TRPCClientError,
  createTRPCUntypedClient,
  type CreateTRPCClientOptions,
  type TRPCLink,
} from '@trpc/client';
import {transformResult} from '@trpc/server/unstable-core-do-not-import';

export function createDirectClient<Router extends AnyTRPCRouter>(
  router: Router,
  {links = [] as any}: Partial<CreateTRPCClientOptions<Router>> = {},
) {
  return createTRPCUntypedClient<Router>({
    links: [...links, directLink(router)],
  });
}

export function directLink<Router extends AnyTRPCRouter>(
  router: Router,
): TRPCLink<Router> {
  return function fancyLink() {
    return function operationLink({op}) {
      return observable((observer) => {
        const {path, input, type} = op;

        const result = callProcedure({
          path,
          getRawInput: () => Promise.resolve(input),
          type,
          ctx: {},
          procedures: router._def.procedures,
        });

        result
          .then((result) => {
            const transformed = transformResult(
              {result: {data: result, type: 'data'}},
              router._def._config.transformer.output,
            );

            if (!transformed.ok) {
              observer.error(
                TRPCClientError.from(transformed.error, {
                  // meta: res.meta,
                }),
              );
              return;
            }
            observer.next({
              // context: res.meta,
              result: transformed.result,
            });
            observer.complete();
          })
          .catch((cause) => {
            observer.error(TRPCClientError.from(cause));
          });

        return () => {
          // noop
        };
      });
    };
  };
}
