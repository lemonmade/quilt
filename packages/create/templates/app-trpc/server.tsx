import '@quilted/quilt/global';

import {type GraphQLFetch, type GraphQLData} from '@quilted/quilt';
import {createRequestRouter, json} from '@quilted/quilt/request-router';
import {createServerRender} from '@quilted/quilt/server';
import {createAssetManifest} from '@quilted/quilt/magic/asset-manifest';
import {fetchRequestHandler} from '@trpc/server/adapters/fetch';

import {appRouter} from './trpc';

const router = createRequestRouter();

router.any(
  'api',
  (request) => {
    return fetchRequestHandler({
      endpoint: '/api',
      req: request,
      router: appRouter,
      createContext: () => ({}),
    });
  },
  {exact: false},
);

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
      assets: createAssetManifest(),
    },
  ),
);

export default router;
