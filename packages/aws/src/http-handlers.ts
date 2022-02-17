import type {APIGatewayProxyHandlerV2} from 'aws-lambda';

import {
  notFound,
  createHeaders,
  getResponseSetCookieHeaders,
} from '@quilted/http-handlers';
import type {HttpHandler} from '@quilted/http-handlers';

export function createLambdaApiGatewayProxy(
  handler: HttpHandler,
): APIGatewayProxyHandlerV2 {
  return async (event, context) => {
    // eslint-disable-next-line no-console
    console.log(event);

    context.callbackWaitsForEmptyEventLoop = false;

    const headers = createHeaders(event.headers as Record<string, string>);

    if (event.cookies != null && event.cookies.length > 0) {
      headers.set('Cookie', event.cookies.join('; '));
    }

    const response =
      (await handler.run({
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
      })) ?? notFound();

    const setCookieHeaders = getResponseSetCookieHeaders(response);

    return {
      statusCode: response.status,
      body: response.body,
      cookies: setCookieHeaders,
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
