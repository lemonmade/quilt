import {createServer} from 'http';
import type {RequestListener, IncomingMessage, ServerResponse} from 'http';
import {URL} from 'url';

import {createHeaders} from '@quilted/http';

import {notFound} from '../response-helpers';
import {handleRequest} from '../handle';
import type {ResponseOrEnhancedResponse} from '../response';
import type {RequestRouter, RequestHandler} from '../types';

import type {} from './types';

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
        (await handleRequest(handler, request, context)) ?? notFound();

      await sendResponse(response, res);
    } catch (error) {
      // eslint-disable-next-line no-console
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

  const requestInit: RequestInit = {
    method,
    headers: createHeaders(
      Object.entries(request.headers).map<[string, string]>(
        ([header, value]) => [
          header,
          Array.isArray(value) ? value.join(',') : value ?? '',
        ],
      ),
    ),
    ...explicitOptions,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    requestInit.body = request as any;
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
  const setCookieHeaders = cookies?.getAll();

  httpResponse.writeHead(
    status,
    [...headers].reduce<Record<string, string | string[]>>(
      (allHeaders, [key, value]) => {
        if (key.toLowerCase() === 'set-cookie') return allHeaders;

        allHeaders[key] = value;
        return allHeaders;
      },
      setCookieHeaders ? {'Set-Cookie': setCookieHeaders} : {},
    ),
  );

  if (body) {
    const reader = body.getReader();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const {done, value} = await reader.read();

      if (done) break;

      httpResponse.write(value);
    }
  }

  httpResponse.end();
}
