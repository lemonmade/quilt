import {NotFound} from '@quilted/quilt/server';
import {Routes} from '@quilted/quilt/navigation';
import {QuiltFrameworkContext} from '@quilted/quilt/context';

import {Head} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Home, homeQuery} from './features/home.ts';

import type {AppContext} from './context/types.ts';
import {AppContextPreact} from './context/preact.ts';
import {routeWithAppContext} from './context/navigation.ts';

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
        async load({context: {graphql}}) {
          await Promise.all([Home.load(), graphql.cache?.query(homeQuery)]);
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
      <QuiltFrameworkContext
        navigation={context.navigation}
        localization={context.localization}
        graphql={context.graphql}
      >
        <Head />
        <Routes list={routes} context={context} />
      </QuiltFrameworkContext>
    </AppContextPreact.Provider>
  );
}

export default App;
