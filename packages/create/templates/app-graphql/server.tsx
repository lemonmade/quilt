import '@quilted/quilt/globals';

import {RequestRouter, JSONResponse} from '@quilted/quilt/request-router';
import {type GraphQLFetch} from '@quilted/quilt/graphql';
import {BrowserAssets} from '@quilted/quilt/magic/assets';

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
  const [{App}, {performGraphQLOperation}, {renderToResponse}] =
    await Promise.all([
      import('./App.tsx'),
      import('./server/graphql.ts'),
      import('@quilted/quilt/server'),
    ]);

  // GraphQL API, called during server rendering
  const fetchGraphQL: GraphQLFetch = async (operation, options) => {
    const result = await performGraphQLOperation<any>(
      (operation as any).source,
      {
        variables: options?.variables as any,
        operationName: (operation as any).name,
      },
    );

    return result;
  };

  const response = await renderToResponse(<App fetchGraphQL={fetchGraphQL} />, {
    request,
    assets,
  });

  return response;
});

export default router;
