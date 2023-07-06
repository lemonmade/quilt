import '@quilted/quilt/global';

import {createRequestRouter, json} from '@quilted/quilt/request-router';
import {createServerRender} from '@quilted/quilt/server';
import {type GraphQLFetch} from '@quilted/quilt/graphql';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';

const router = createRequestRouter();

// GraphQL API, called from the client
router.post('/api/graphql', async (request) => {
  const [{performGraphQLOperation}, {query, operationName, variables}] =
    await Promise.all([import('./server/graphql.ts'), request.json()]);

  const result = await performGraphQLOperation(query, {
    variables,
    operationName,
  });

  return json(result);
});

// For all GET requests, render our React application.
router.get(
  createServerRender(
    async () => {
      const [{default: App}, {performGraphQLOperation}] = await Promise.all([
        import('./App.tsx'),
        import('./server/graphql.ts'),
      ]);

      // GraphQL API, called during server rendering
      const fetchGraphQL: GraphQLFetch = async (operation, variables) => {
        const result = await performGraphQLOperation(operation.source, {
          variables,
          operationName: operation.name,
        });

        return result;
      };

      return <App fetchGraphQL={fetchGraphQL} />;
    },
    {
      assets: createBrowserAssets(),
    },
  ),
);

export default router;
