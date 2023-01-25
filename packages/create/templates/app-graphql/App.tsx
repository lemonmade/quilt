import {useMemo} from 'react';
import {
  QuiltApp,
  GraphQLContext,
  createGraphQLHttpFetch,
  type GraphQLFetch,
  useRoutes,
  RoutePreloading,
  type PropsWithChildren,
} from '@quilted/quilt';
import {ReactQueryContext} from '@quilted/react-query';
import {QueryClient} from '@tanstack/react-query';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
import {Metrics} from './foundation/Metrics';

import {Start} from './features/Start';

export interface Props {
  fetchGraphQL?: GraphQLFetch;
}

// The root component for your application. You will typically render any
// app-wide context in this component.
export default function App(props: Props) {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <RoutePreloading>
        <AppContext {...props}>
          <Routes />
        </AppContext>
      </RoutePreloading>
    </QuiltApp>
  );
}

// This component renders the routes for your application. If you have a lot
// of routes, you may want to split this component into its own file.
function Routes() {
  return useRoutes([
    {
      match: '/',
      render: () => <Start />,
      renderPreload: () => <Start.Preload />,
    },
  ]);
}

// This component renders any app-wide context.
function AppContext({
  children,
  fetchGraphQL: customFetchGraphQL,
}: PropsWithChildren<Props>) {
  const {fetchGraphQL, queryClient} = useMemo(() => {
    return {
      fetchGraphQL:
        customFetchGraphQL ?? createGraphQLHttpFetch({uri: '/api/graphql'}),
      queryClient: new QueryClient(),
    };
  }, [customFetchGraphQL]);

  return (
    <GraphQLContext fetch={fetchGraphQL}>
      <ReactQueryContext client={queryClient}>
        <Metrics>{children}</Metrics>
      </ReactQueryContext>
    </GraphQLContext>
  );
}
