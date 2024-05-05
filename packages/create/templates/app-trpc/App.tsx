import {type PropsWithChildren} from 'react';

import {Routing, useRoutes} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';

import {ReactQueryContext} from '@quilted/react-query';

import {HTML} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Start} from './features/start.ts';

import {trpc} from './shared/trpc.ts';
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
function AppContext({children, context}: PropsWithChildren<AppProps>) {
  const locale = useLocaleFromEnvironment() ?? 'en';

  return (
    <AppContextReact.Provider value={context}>
      <Localization locale={locale}>
        <Routing>
          <trpc.Provider
            client={context.trpc}
            queryClient={context.queryClient}
          >
            <ReactQueryContext client={context.queryClient}>
              {children}
            </ReactQueryContext>
          </trpc.Provider>
        </Routing>
      </Localization>
    </AppContextReact.Provider>
  );
}
