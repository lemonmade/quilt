import {NotFound} from '@quilted/quilt/server';
import {Routes} from '@quilted/quilt/navigation';
import {QuiltFrameworkContext} from '@quilted/quilt/context';

import {Head} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Home} from './features/home.ts';

import type {AppContext} from './context/types.ts';
import {AppContextPreact} from './context/preact.ts';
import {routeWithAppContext} from './context/navigation.ts';

export interface AppProps {
  context: AppContext;
}

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

export function App({context}: AppProps) {
  return (
    <AppContextPreact.Provider value={context}>
      <QuiltFrameworkContext
        navigation={context.navigation}
        localization={context.localization}
      >
        <Head />
        <Routes list={routes} context={context} />
      </QuiltFrameworkContext>
    </AppContextPreact.Provider>
  );
}

export default App;
