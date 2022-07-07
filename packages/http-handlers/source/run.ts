import type {HttpHandler, RequestHandler, RequestContext} from './types';
import {EnhancedRequest} from './request';

export function runHandler(
  handler: HttpHandler | RequestHandler,
  request: Request,
  context?: RequestContext,
) {
  return typeof handler === 'function'
    ? handler(new EnhancedRequest(request), context ?? ({} as any))
    : handler.run(request, context);
}
