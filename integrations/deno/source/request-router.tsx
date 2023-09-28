import {NotFoundResponse, handleRequest} from '@quilted/quilt/request-router';
import type {
  RequestRouter,
  RequestHandler,
} from '@quilted/quilt/request-router';

/**
 * Creates a Deno request handler from a Quilt HTTP handler.
 * The request handler can be passed directly as handler to
 * `Deno.serve()`.
 */
export function createServeHandler(
  handler: RequestRouter | RequestHandler,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const response =
      (await handleRequest(handler, request)) ?? new NotFoundResponse();
    return response;
  };
}
