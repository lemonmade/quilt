import * as Cookies from 'cookie';
import type {APIGatewayProxyHandlerV2} from 'aws-lambda';

import {notFound, createHeaders} from '@quilted/http-handlers';
import type {HttpHandler} from '@quilted/http-handlers';

export function createLambdaApiGatewayProxy(
  handler: HttpHandler,
): APIGatewayProxyHandlerV2 {
  return async (event, context) => {
    // eslint-disable-next-line no-console
    console.log(event);

    context.callbackWaitsForEmptyEventLoop = false;

    const headers = createHeaders(event.headers as Record<string, string>);

    const cookies = Cookies.parse(event.cookies?.join('; ') ?? '');

    const response =
      (await handler.run({
        // The forEach() signature is slightly different in the polyfill,
        // but not in a way that matters.
        headers: headers as any,
        method: event.requestContext.http.method,
        body: event.body,
        url: new URL(
          `${headers.get('X-Forwarded-Proto') ?? 'https'}://${
            headers.get('X-Forwarded-Host') ?? event.requestContext.domainName
          }${event.rawPath}${
            event.rawQueryString ? `?${event.rawQueryString}` : ''
          }`,
        ),
        cookies: {
          get: (key) => cookies[key],
          has: (key) => cookies[key] != null,
          *entries() {
            yield* Object.entries(cookies);
          },
          *[Symbol.iterator]() {
            yield* Object.values(cookies);
          },
        },
      })) ?? notFound();

    return {
      statusCode: response.status,
      body: response.body,
      cookies: [...response.cookies],
      headers: [...response.headers].reduce<Record<string, string>>(
        (allHeaders, [header, value]) => {
          if (header.toLowerCase() === 'set-cookie') return allHeaders;

          allHeaders[header] = value;
          return allHeaders;
        },
        {},
      ),
    };
  };
}
