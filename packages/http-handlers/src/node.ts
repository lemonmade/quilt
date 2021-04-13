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
        url: new URL(request.url!, `http://${request.headers.host}`),
        headers: new Headers(
          Object.entries(request.headers).map<[string, string]>(
            ([header, value]) => [
              header,
              Array.isArray(value) ? value.join(',') : value ?? '',
            ],
          ),
        ),
      })) ?? notFound();

    const {status, headers} = result;

    response.writeHead(
      status,
      [...headers].reduce<Record<string, string>>(
        (allHeaders, [key, value]) => {
          allHeaders[key] = value;
          return allHeaders;
        },
        {},
      ),
    );

    response.write(await result.text());
    response.end();
  };
}
