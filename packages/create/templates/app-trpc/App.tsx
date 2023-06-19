import {QuiltApp, useRoutes, type PropsWithChildren} from '@quilted/quilt';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from '~/shared/context.ts';

import {Http} from './foundation/Http.tsx';
import {Head} from './foundation/Head.tsx';
import {Metrics} from './foundation/Metrics.tsx';

import {Start} from './features/Start.tsx';

export interface Props extends AppContextType {}

// The root component for your application. You will typically render any
// app-wide context in this component.
export default function App(props: Props) {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <AppContext {...props}>
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
function AppContext({
  children,
  ...appContext
}: PropsWithChildren<AppContextType>) {
  return (
    <AppContextReact.Provider value={appContext}>
      <Metrics>{children}</Metrics>
    </AppContextReact.Provider>
  );
}
