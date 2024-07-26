import type {RenderableProps} from 'preact';

import {NotFound} from '@quilted/quilt/server';
import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';

import {HTML} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Home} from './features/home.ts';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from './shared/context.ts';
import {routeWithAppContext} from './shared/navigation.ts';

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
    <AppContext context={context}>
      <HTML>
        <Navigation router={context.router} routes={routes} context={context} />
      </HTML>
    </AppContext>
  );
}

export default App;

// This component renders any app-wide context.
function AppContext({children, context}: RenderableProps<AppProps>) {
  return (
    <AppContextReact.Provider value={context}>
      <Localization>{children}</Localization>
    </AppContextReact.Provider>
  );
}
