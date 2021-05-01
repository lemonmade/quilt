import {createServer} from 'http';
import type {RequestListener} from 'http';

import {notFound} from './response';
import type {HttpHandler} from './types';

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

      const result =
        (await handler.run({
          body,
          method: request.method!,
          url: new URL(
            request.url!,
            `${request.headers['x-forwarded-proto'] ?? 'http'}://${
              request.headers['x-forwarded-host'] ?? request.headers.host
            }`,
          ),
          headers: new Headers(
            Object.entries(request.headers).map<[string, string]>(
              ([header, value]) => [
                header,
                Array.isArray(value) ? value.join(',') : value ?? '',
              ],
            ),
          ),
        })) ?? notFound();

      const {status, headers, cookies} = result;
      const text = await result.text();

      const setCookies = [...cookies];

      response.writeHead(
        status,
        [...headers].reduce<Record<string, string | string[]>>(
          (allHeaders, [key, value]) => {
            if (key.toLowerCase() === 'set-cookie') return allHeaders;
            allHeaders[key] = value;
            return allHeaders;
          },
          setCookies.length > 0 ? {'set-cookie': setCookies} : {},
        ),
      );

      response.write(text);
      response.end();
    } catch {
      response.writeHead(500);
      response.end();
    }
  };
}
