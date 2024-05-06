import type {RenderableProps} from 'preact';

import {Routing, useRoutes} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';
import {GraphQLContext} from '@quilted/quilt/graphql';

import {ReactQueryContext} from '@quilted/react-query';

import {HTML} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Start} from './features/start.ts';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from './shared/context.ts';

export interface AppProps {
  context: AppContextType;
}

// The root component for your application. You will typically render any
// app-wide context in this component.
export function App({context}: AppProps) {
  return (
    <AppContext context={context}>
      <HTML>
        <Frame>
          <Routes />
        </Frame>
      </HTML>
    </AppContext>
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
function AppContext({children, context}: RenderableProps<AppProps>) {
  const locale = useLocaleFromEnvironment() ?? 'en';

  return (
    <AppContextReact.Provider value={context}>
      <GraphQLContext fetch={context.fetchGraphQL}>
        <ReactQueryContext client={context.queryClient}>
          <Localization locale={locale}>
            <Routing>{children}</Routing>
          </Localization>
        </ReactQueryContext>
      </GraphQLContext>
    </AppContextReact.Provider>
  );
}
