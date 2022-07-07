import type {APIGatewayProxyHandlerV2} from 'aws-lambda';

import {
  notFound,
  runHandler,
  createHeaders,
  EnhancedResponse,
} from '@quilted/quilt/http-handlers';
import type {HttpHandler, RequestHandler} from '@quilted/quilt/http-handlers';

export function createLambdaApiGatewayProxy(
  handler: HttpHandler | RequestHandler,
): APIGatewayProxyHandlerV2 {
  return async (event, context) => {
    // eslint-disable-next-line no-console
    console.log(event);

    context.callbackWaitsForEmptyEventLoop = false;

    const headers = createHeaders(event.headers as Record<string, string>);

    if (event.cookies != null && event.cookies.length > 0) {
      headers.set('Cookie', event.cookies.join('; '));
    }

    const response: Response | EnhancedResponse =
      (await runHandler(
        handler,
        new Request(
          `${headers.get('X-Forwarded-Proto') ?? 'https'}://${
            headers.get('X-Forwarded-Host') ?? event.requestContext.domainName
          }${event.rawPath}${
            event.rawQueryString ? `?${event.rawQueryString}` : ''
          }`,
          {
            headers,
            method: event.requestContext.http.method,
            body: event.body,
          },
        ),
      )) ?? notFound();

    const body = await response.text();

    return {
      statusCode: response.status,
      body,
      cookies: (response as any).cookies?.getAll(),
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
