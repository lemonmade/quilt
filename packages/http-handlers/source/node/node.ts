import {createServer} from 'http';
import type {RequestListener, IncomingMessage, ServerResponse} from 'http';
import {URL} from 'url';

import {createHeaders} from '@quilted/http';

import {notFound} from '../response';
import type {HttpHandler, Response, RequestOptions} from '../types';

import type {} from './types';

export function createHttpServer(handler: HttpHandler) {
  return createServer(createHttpRequestListener(handler));
}

export function createHttpRequestListener(
  handler: HttpHandler,
): RequestListener {
  return async (request, response) => {
    try {
      const transformedRequest = await transformRequest(request);

      const result =
        (await handler.run(transformedRequest, {request, response})) ??
        notFound();

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
