import type {RequestRouter, RequestHandler, RequestContext} from './types.ts';
import {EnhancedRequest} from './request.ts';

export function handleRequest(
  handler: RequestRouter | RequestHandler,
  request: Request,
  context?: RequestContext,
) {
  return typeof handler === 'function'
    ? handler(new EnhancedRequest(request), context ?? ({} as any))
    : handler.fetch(request, context);
}
