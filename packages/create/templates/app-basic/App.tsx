import {type PropsWithChildren} from '@quilted/quilt';
import {Http} from '@quilted/quilt/http';
import {Html} from '@quilted/quilt/html';
import {Routing, useRoutes} from '@quilted/quilt/navigate';
import {Localization} from '@quilted/quilt/localize';

import {Head} from './foundation/html.ts';
import {Headers} from './foundation/http.ts';
import {Metrics} from './foundation/metrics.ts';

import {Start} from './features/Start.tsx';

// The root component for your application. You will typically render any
// app-wide context in this component.
export function App() {
  return (
    <Http>
      <Html>
        <Localization locale="en">
          <Routing>
            <AppContext>
              <Headers />
              <Head />
              <Routes />
            </AppContext>
          </Routing>
        </Localization>
      </Html>
    </Http>
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
function AppContext({children}: PropsWithChildren) {
  return <Metrics>{children}</Metrics>;
}
