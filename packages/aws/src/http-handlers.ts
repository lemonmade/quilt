import {notFound} from '@quilted/http-handlers';
import type {HttpHandler} from '@quilted/http-handlers';
import * as Cookies from 'cookie';
import type {APIGatewayProxyHandlerV2} from 'aws-lambda';

export function createLambdaApiGatewayProxy(
  app: HttpHandler,
): APIGatewayProxyHandlerV2 {
  return async (event) => {
    // eslint-disable-next-line no-console
    console.log(event);

    const headers = new Headers(event.headers as Record<string, string>);

    const cookies = Cookies.parse(event.cookies?.join(', ') ?? '');

    const response =
      (await app.run({
        headers,
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
        },
      })) ?? notFound();

    return {
      statusCode: response.status,
      body: await response.text(),
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
