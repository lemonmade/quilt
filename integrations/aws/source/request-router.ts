import type {APIGatewayProxyHandlerV2} from 'aws-lambda';

import {
  NotFoundResponse,
  handleRequest,
  createHeaders,
  EnhancedResponse,
  type RequestRouter,
  type RequestHandler,
} from '@quilted/quilt/request-router';

export function createLambdaApiGatewayProxy(
  handler: RequestRouter | RequestHandler,
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
      (await handleRequest(
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
      )) ?? new NotFoundResponse();

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
