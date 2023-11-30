import {createServer} from 'http';
import type {RequestListener, IncomingMessage, ServerResponse} from 'http';
import {URL} from 'url';

import {NotFoundResponse} from '../response-helpers.ts';
import {handleRequest} from '../handle.ts';
import type {ResponseOrEnhancedResponse} from '../response.ts';
import type {RequestRouter, RequestHandler} from '../router.ts';

import type {} from './types.ts';

export function createHttpServer(
  ...args: Parameters<typeof createHttpRequestListener>
) {
  return createServer(createHttpRequestListener(...args));
}

export function createHttpRequestListener(
  handler: RequestRouter | RequestHandler,
  {
    createRequest: create = createRequest,
  }: {
    createRequest?(
      request: IncomingMessage,
      options?: Omit<RequestInit, 'method' | 'headers'>,
    ): Request | Promise<Request>;
  } = {},
): RequestListener {
  return async (req, res) => {
    const abort = new AbortController();

    req.on('close', () => {
      abort.abort();
    });

    try {
      const request = await create(req, {signal: abort.signal});

      const context = {
        request: req,
        response: res,
      };

      const response =
        (await handleRequest(handler, request, context)) ??
        new NotFoundResponse();

      await sendResponse(response, res);
    } catch (error) {
      console.error(error);
      res.writeHead(500);
      res.end();
    }
  };
}

export function createRequest(
  request: IncomingMessage,
  explicitOptions?: Omit<RequestInit, 'method' | 'headers'>,
): Request {
  const method = request.method;

  const headers = new Headers();

  for (const [header, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') {
      headers.set(header, value);
    } else if (Array.isArray(value)) {
      for (const arrayValue of value) {
        headers.append(header, arrayValue);
      }
    }
  }

  const requestInit: RequestInit = {
    method,
    headers,
    ...explicitOptions,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    requestInit.body = request as any;
    // @see https://github.com/nodejs/node/issues/46221
    (requestInit as any).duplex = 'half';
  }

  const forwardedProtocolHeader = request.headers['x-forwarded-proto'];
  const forwardedProtocol = Array.isArray(forwardedProtocolHeader)
    ? forwardedProtocolHeader[0]
    : forwardedProtocolHeader?.split(/\s*,\s*/)[0];

  return new Request(
    new URL(
      request.url!,
      `${forwardedProtocol ?? 'http'}://${
        request.headers['x-forwarded-host'] ?? request.headers.host
      }`,
    ),
    requestInit,
  );
}

export async function sendResponse(
  response: ResponseOrEnhancedResponse,
  httpResponse: ServerResponse,
) {
  const {status, headers, body, cookies} = response;
  const setCookieHeaders = headers.getSetCookie?.() ?? cookies?.getAll();

  httpResponse.writeHead(
    status,
    [...headers].reduce<Record<string, string | string[]>>(
      (allHeaders, [key, value]) => {
        if (key.toLowerCase() === 'set-cookie') return allHeaders;

        allHeaders[key] = value;
        return allHeaders;
      },
      setCookieHeaders && setCookieHeaders.length > 0
        ? {'Set-Cookie': setCookieHeaders}
        : {},
    ),
  );

  if (body) {
    const reader = body.getReader();

    while (true) {
      const {done, value} = await reader.read();

      if (done) break;

      httpResponse.write(value);
    }
  }

  httpResponse.end();
}
