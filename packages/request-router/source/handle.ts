import type {RequestRouter, RequestHandler, RequestContext} from './types';
import {EnhancedRequest} from './request';

export function handleRequest(
  handler: RequestRouter | RequestHandler,
  request: Request,
  context?: RequestContext,
) {
  return typeof handler === 'function'
    ? handler(new EnhancedRequest(request), context ?? ({} as any))
    : handler.fetch(request, context);
}
