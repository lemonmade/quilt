import type {RenderableProps} from 'preact';

import {NotFound} from '@quilted/quilt/server';
import {Navigation, route} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';

import {HTML} from './foundation/html.ts';
import {Frame} from './foundation/frame.ts';

import {Home} from './features/home.ts';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from './shared/context.ts';

export interface AppProps {
  context: AppContextType;
}

// Define the routes for your application. If you have a lot of routes, you
// might want to split this into a separate file.
const routes = [
  route('*', {
    render: (children) => <Frame>{children}</Frame>,
    children: [
      route('/', {
        async load() {
          await Promise.all([Home.load()]);
        },
        render: <Home />,
      }),
      route('*', {render: <NotFound />}),
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
  const locale = useLocaleFromEnvironment() ?? 'en';

  return (
    <AppContextReact.Provider value={context}>
      <Localization locale={locale}>{children}</Localization>
    </AppContextReact.Provider>
  );
}
