import {useMemo, type PropsWithChildren} from 'react';

import {HTML} from '@quilted/quilt/html';
import {Routing, useRoutes} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';
import {GraphQLContext, type GraphQLRun} from '@quilted/quilt/graphql';

import {ReactQueryContext} from '@quilted/react-query';
import {QueryClient} from '@tanstack/react-query';

import {Head} from './foundation/html.ts';
import {Headers} from './foundation/http.ts';
import {Frame} from './foundation/frame.ts';

import {Start} from './features/start.ts';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from './shared/context.ts';

export interface AppProps extends AppContextType {
  fetchGraphQL: GraphQLRun;
}

// The root component for your application. You will typically render any
// app-wide context in this component.
export function App(props: AppProps) {
  const locale = useLocaleFromEnvironment() ?? 'en';

  return (
    <HTML>
      <Localization locale={locale}>
        <Routing>
          <AppContext {...props}>
            <Headers />
            <Head />
            <Frame>
              <Routes />
            </Frame>
          </AppContext>
        </Routing>
      </Localization>
    </HTML>
  );
}

export default App;

// This component renders the routes for your application. If you have a lot
// of routes, you may want to split this component into its own file.
function Routes() {
  return useRoutes([
    {match: '/', render: <Start />, renderPreload: <Start.Preload />},
  ]);
}

// This component renders any app-wide context.
function AppContext({
  children,
  fetchGraphQL,
  ...context
}: PropsWithChildren<AppProps>) {
  const {queryClient} = useMemo(() => {
    return {
      queryClient: new QueryClient(),
    };
  }, []);

  return (
    <GraphQLContext fetch={fetchGraphQL}>
      <ReactQueryContext client={queryClient}>
        <AppContextReact.Provider value={context}>
          {children}
        </AppContextReact.Provider>
      </ReactQueryContext>
    </GraphQLContext>
  );
}
