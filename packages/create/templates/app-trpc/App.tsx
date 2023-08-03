import {
  QuiltApp,
  useRoutes,
  type PropsWithChildren,
  useInitialUrl,
} from '@quilted/quilt';

import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';
import {ReactQueryContext} from '@quilted/react-query';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from '~/shared/context.ts';
import {trpc} from '~/shared/trpc.ts';

import {Http} from './foundation/Http.tsx';
import {Head} from './foundation/Head.tsx';
import {Metrics} from './foundation/Metrics.tsx';

import {Start} from './features/Start.tsx';
import {useMemo} from 'react';

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
  const initialUrl = useInitialUrl();

  const {queryClient, trpcClient} = useMemo(() => {
    return {
      queryClient: new QueryClient(),
      trpcClient: trpc.createClient({
        links: [
          // We need to use an absolute URL so that queries will
          // work during server-side rendering
          httpBatchLink({url: new URL('/api', initialUrl).href}),
        ],
      }),
    };
  }, [initialUrl]);

  return (
    <AppContextReact.Provider value={appContext}>
      <Metrics>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <ReactQueryContext client={queryClient}>{children}</ReactQueryContext>
        </trpc.Provider>
      </Metrics>
    </AppContextReact.Provider>
  );
}
