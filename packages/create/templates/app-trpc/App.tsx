import {NotFound} from '@quilted/quilt/server';
import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';

import {ReactQueryContext} from '@quilted/react-query';

import {Head} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Home} from './features/home.ts';

import {trpc} from './context/trpc.ts';
import type {AppContext as AppContextType} from './context/types.ts';
import {AppContextPreact} from './context/preact.ts';
import {routeWithAppContext} from './context/navigation.ts';

export interface AppProps {
  context: AppContextType;
}

// Define the routes for your application. If you have a lot of routes, you
// might want to split this into a separate file.
const routes = [
  routeWithAppContext('*', {
    render: (children) => <Frame>{children}</Frame>,
    children: [
      routeWithAppContext('/', {
        async load() {
          await Promise.all([Home.load()]);
        },
        render: <Home />,
      }),
      routeWithAppContext('*', {render: <NotFound />}),
    ],
  }),
];

// The root component for your application. You will typically render any
// app-wide context in this component.
export function App({context}: AppProps) {
  return (
    <AppContextPreact.Provider value={context}>
      <trpc.Provider client={context.trpc} queryClient={context.queryClient}>
        <ReactQueryContext client={context.queryClient}>
          <Localization>
            <Head />
            <Navigation
              router={context.navigation.router}
              routes={routes}
              context={context}
            />
          </Localization>
        </ReactQueryContext>
      </trpc.Provider>
    </AppContextPreact.Provider>
  );
}

export default App;
