import {NotFound} from '@quilted/quilt/server';
import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';

import {Head} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Home} from './features/home.ts';

import {AppContextPreact, type AppContext} from './shared/context.ts';
import {routeWithAppContext} from './shared/navigation.ts';

export interface AppProps {
  context: AppContext;
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
      <Localization>
        <Head />
        <Navigation router={context.router} routes={routes} context={context} />
      </Localization>
    </AppContextPreact.Provider>
  );
}

export default App;
