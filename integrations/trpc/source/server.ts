import {callProcedure, type AnyRouter} from '@trpc/server';
import {observable} from '@trpc/server/observable';
import {
  TRPCClientError,
  createTRPCClient,
  type CreateTRPCClientOptions,
  type TRPCLink,
} from '@trpc/client';
import {transformResult} from '@trpc/client/shared';

export function createDirectClient<Router extends AnyRouter>(
  router: Router,
  {
    links = [] as any,
    transformer,
  }: Partial<CreateTRPCClientOptions<Router>> = {},
) {
  return createTRPCClient<Router>({
    transformer,
    links: [...links, directLink(router)],
  } as any);
}

export function directLink<Router extends AnyRouter>(
  router: Router,
): TRPCLink<Router> {
  return function fancyLink(runtime) {
    return function operationLink({op}) {
      return observable((observer) => {
        const {path, input, type} = op;

        const result = callProcedure({
          path,
          rawInput: input,
          type,
          ctx: {},
          procedures: router._def.procedures,
        });

        result
          .then((result) => {
            const transformed = transformResult(
              {result: {data: result, type: 'data'}},
              runtime,
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
