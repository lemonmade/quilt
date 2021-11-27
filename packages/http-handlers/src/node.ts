import {createServer} from 'http';
import type {RequestListener} from 'http';
import serve from 'serve-static';

import {createHeaders} from '@quilted/http';

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
          headers: createHeaders(
            Object.entries(request.headers).map<[string, string]>(
              ([header, value]) => [
                header,
                Array.isArray(value) ? value.join(',') : value ?? '',
              ],
            ),
          ) as any,
        })) ?? notFound();

      const {status, headers, cookies, body: resultBody} = result;

      const setCookies = [...cookies];

      response.writeHead(
        status,
        [...headers].reduce<Record<string, string | string[]>>(
          (allHeaders, [key, value]) => {
            allHeaders[key] = value;
            return allHeaders;
          },
          setCookies.length > 0 ? {'set-cookie': setCookies} : {},
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

export function serveStatic(root: string) {
  return serve(root, {
    index: false,
    dotfiles: 'ignore',
    fallthrough: false,
    setHeaders(response) {
      response.setHeader('Cache-Control', 'no-store');
    },
  });
}
