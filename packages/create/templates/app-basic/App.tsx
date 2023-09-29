import {type PropsWithChildren} from '@quilted/quilt';
import {HTML} from '@quilted/quilt/html';
import {Routing, useRoutes} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';

import {Head} from './foundation/html.ts';
import {Headers} from './foundation/http.ts';
import {Observability} from './foundation/observability.ts';

import {Start} from './features/Start.tsx';

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
            <Routes />
          </AppContext>
        </Routing>
      </Localization>
    </HTML>
  );
}

// This component renders the routes for your application. If you have a lot
// of routes, you may want to split this component into its own file.
function Routes() {
  return useRoutes([
    {match: '/', render: <Start />, renderPreload: <Start.Preload />},
  ]);
}

// This component renders any app-wide context.
function AppContext({children, ...context}: PropsWithChildren<AppContextType>) {
  return (
    <Observability>
      <AppContextReact.Provider value={context}>
        {children}
      </AppContextReact.Provider>
    </Observability>
  );
}
