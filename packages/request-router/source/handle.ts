import {EnhancedRequest} from './request.ts';
import {ResponseShortCircuitError} from './errors/ResponseShortCircuitError.ts';
import type {RequestRouter, RequestHandler} from './router.ts';
import type {RequestContext} from './types.ts';

export async function handleRequest(
  handler: Pick<RequestRouter, 'fetch'> | RequestHandler,
  request: Request,
  context?: RequestContext,
) {
  try {
    const response =
      typeof handler === 'function'
        ? await handler(new EnhancedRequest(request), context ?? ({} as any))
        : await handler.fetch(request, context);

    return response ?? undefined;
  } catch (error) {
    if (error instanceof Response) {
      return error;
    } else if (
      (error as any as ResponseShortCircuitError)?.response instanceof Response
    ) {
      return (error as any as ResponseShortCircuitError).response;
    } else {
      throw error;
    }
  }
}
