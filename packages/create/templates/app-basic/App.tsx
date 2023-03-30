import {QuiltApp, useRoutes, type PropsWithChildren} from '@quilted/quilt';

import {Http} from './foundation/Http.tsx';
import {Head} from './foundation/Head.tsx';
import {Metrics} from './foundation/Metrics.tsx';

import {Start} from './features/Start.tsx';

// The root component for your application. You will typically render any
// app-wide context in this component.
export default function App() {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <AppContext>
        <Routes />
      </AppContext>
    </QuiltApp>
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
