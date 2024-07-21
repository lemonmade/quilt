import '@quilted/quilt/globals';

import {RequestRouter, JSONResponse} from '@quilted/quilt/request-router';
import {Router} from '@quilted/quilt/navigation';
import {BrowserAssets} from 'quilt:module/assets';

import type {AppContext} from '~/shared/context.ts';

const router = new RequestRouter();
const assets = new BrowserAssets();

// GraphQL API, called from the client
router.post('/api/graphql', async (request) => {
  const [{query, operationName, variables}, {performGraphQLOperation}] =
    await Promise.all([request.json(), import('./server/graphql.ts')]);

  const result = await performGraphQLOperation(query, {
    variables,
    operationName,
  });

  return new JSONResponse(result);
});

// For all GET requests, render our React application.
router.get(async (request) => {
  const [{App}, {performGraphQLOperation}, {GraphQLCache}, {renderToResponse}] =
    await Promise.all([
      import('./App.tsx'),
      import('./server/graphql.ts'),
      import('@quilted/quilt/graphql'),
      import('@quilted/quilt/server'),
    ]);

  const context = {
    router: new Router(request.url),
    graphql: {
      fetch: performGraphQLOperation,
      cache: new GraphQLCache({fetch: performGraphQLOperation}),
    },
  } satisfies AppContext;

  const response = await renderToResponse(<App context={context} />, {
    request,
    assets,
  });

  return response;
});

export default router;
