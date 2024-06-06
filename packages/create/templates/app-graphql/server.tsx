import '@quilted/quilt/globals';

import {RequestRouter, JSONResponse} from '@quilted/quilt/request-router';
import {BrowserAssets} from 'quilt:module/assets';

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

  const response = await renderToResponse(
    <App
      context={{
        fetchGraphQL: performGraphQLOperation,
        graphQLCache: new GraphQLCache(),
      }}
    />,
    {
      request,
      assets,
    },
  );

  return response;
});

export default router;
