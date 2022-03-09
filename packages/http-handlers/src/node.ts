import {createServer} from 'http';
import type {RequestListener, IncomingMessage, ServerResponse} from 'http';
import send from 'send';
import type {SendStream} from 'send';
import {URL} from 'url';

import {createHeaders} from '@quilted/http';

import {notFound} from './response';
import type {HttpHandler, Response, RequestOptions} from './types';

export function createHttpServer(handler: HttpHandler) {
  return createServer(createHttpRequestListener(handler));
}

export function createHttpRequestListener(
  handler: HttpHandler,
): RequestListener {
  return async (request, response) => {
    try {
      const body = await new Promise<string>((resolve, reject) => {
        let data = '';

        request.on('data', (chunk) => {
          data += String(chunk);
        });

        request.on('end', () => {
          resolve(data);
        });

        request.on('close', () => {
          reject();
        });
      });

      const forwardedProtocolHeader = request.headers['x-forwarded-proto'];
      const forwardedProtocol = Array.isArray(forwardedProtocolHeader)
        ? forwardedProtocolHeader[0]
        : forwardedProtocolHeader?.split(/\s*,\s*/)[0];

      const result =
        (await handler.run({
          body,
          method: request.method!,
          url: new URL(
            request.url!,
            `${forwardedProtocol ?? 'http'}://${
              request.headers['x-forwarded-host'] ?? request.headers.host
            }`,
          ),
          headers: createHeaders(
            Object.entries(request.headers).map<[string, string]>(
              ([header, value]) => [
                header,
                Array.isArray(value) ? value.join(',') : value ?? '',
              ],
            ),
          ),
        })) ?? notFound();

      const {status, headers, cookies, body: resultBody} = result;
      const setCookieHeaders = cookies.getAll();

      response.writeHead(
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

      if (resultBody != null) response.write(resultBody);
      response.end();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      response.writeHead(500);
      response.end();
    }
  };
}

export interface StaticOptions {
  baseUrl?: string;
}

// @see https://github.com/expressjs/serve-static/blob/master/index.js
// @see https://www.npmjs.com/package/send
export function serveStatic(root: string, {baseUrl = '/'}: StaticOptions = {}) {
  const listener: RequestListener = (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET, HEAD');
      response.setHeader('Content-Length', '0');
      response.end();
      return;
    }

    const resolvedUrl = new URL(request.url!, 'https://assets.com');
    const {pathname} = resolvedUrl;
    const replacePathname = baseUrl.startsWith('/')
      ? baseUrl
      : new URL(baseUrl, resolvedUrl).pathname;

    const normalizedPathname = pathname.replace(replacePathname, '');

    const stream = send(request, normalizedPathname, {
      root,
      dotfiles: 'ignore',
      index: false,
    });

    stream.on('headers', () => {
      response.setHeader(
        'Cache-Control',
        'public, max-age=31536000, immutable',
      );
    });

    stream.on('directory', function handleDirectory(this: SendStream) {
      this.error(404);
    });

    stream.on('error', (error) => {
      response.statusCode = error.status;
      response.end(error.message);
    });

    stream.pipe(response);
  };

  return listener;
}

export async function transformRequest(
  request: IncomingMessage,
): Promise<RequestOptions> {
  const body = await new Promise<string>((resolve, reject) => {
    let data = '';

    request.on('data', (chunk) => {
      data += String(chunk);
    });

    request.on('end', () => {
      resolve(data);
    });

    request.on('close', () => {
      reject();
    });
  });

  const forwardedProtocolHeader = request.headers['x-forwarded-proto'];
  const forwardedProtocol = Array.isArray(forwardedProtocolHeader)
    ? forwardedProtocolHeader[0]
    : forwardedProtocolHeader?.split(/\s*,\s*/)[0];

  return {
    body,
    method: request.method!,
    url: new URL(
      request.url!,
      `${forwardedProtocol ?? 'http'}://${
        request.headers['x-forwarded-host'] ?? request.headers.host
      }`,
    ),
    headers: createHeaders(
      Object.entries(request.headers).map<[string, string]>(
        ([header, value]) => [
          header,
          Array.isArray(value) ? value.join(',') : value ?? '',
        ],
      ),
    ),
  };
}

export function applyResponse(
  response: Response,
  httpResponse: ServerResponse,
) {
  const {status, headers, cookies, body: resultBody} = response;
  const setCookieHeaders = cookies.getAll();

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

  if (resultBody != null) httpResponse.write(resultBody);
  httpResponse.end();
}
