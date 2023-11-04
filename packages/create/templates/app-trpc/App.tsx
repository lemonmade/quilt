import {useMemo, type PropsWithChildren} from 'react';

import {HTML} from '@quilted/quilt/html';
import {Routing, useRoutes, useInitialUrl} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';

import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';
import {ReactQueryContext} from '@quilted/react-query';

import {Head} from './foundation/html.ts';
import {Headers} from './foundation/http.ts';
import {Frame} from './foundation/frame.ts';

import {Start} from './features/start.ts';

import {trpc} from './shared/trpc.ts';
import {
  AppContextReact,
  type AppContext as AppContextType,
} from './shared/context.ts';

export interface AppProps extends AppContextType {}

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
function AppContext({children, ...context}: PropsWithChildren<AppProps>) {
  const initialUrl = useInitialUrl();

  const {queryClient, trpcClient} = useMemo(() => {
    return {
      queryClient: new QueryClient(),
      trpcClient: trpc.createClient({
        links: [
          // We need to use an absolute URL so that queries will
          // work during server-side rendering
          httpBatchLink({url: new URL('/api', initialUrl).href}),
        ],
      }),
    };
  }, [initialUrl]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <ReactQueryContext client={queryClient}>
        <AppContextReact.Provider value={context}>
          {children}
        </AppContextReact.Provider>
      </ReactQueryContext>
    </trpc.Provider>
  );
}
