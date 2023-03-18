import '@quilted/quilt/global';

import {type GraphQLFetch, type GraphQLData} from '@quilted/quilt';
import {createRequestRouter, json} from '@quilted/quilt/request-router';
import {createServerRender} from '@quilted/quilt/server';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';

import {performGraphQLOperation} from './server/graphql';

const router = createRequestRouter();

// GraphQL API, called from the client
router.post('/api/graphql', async (request) => {
  const {query, operationName, variables} = await request.json();

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
      const {default: App} = await import('./App');

      // GraphQL API, called during server rendering
      const fetchGraphQL: GraphQLFetch = async (operation, variables) => {
        type Data = GraphQLData<typeof operation>;

        const result = await performGraphQLOperation<Data>(operation.source, {
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
