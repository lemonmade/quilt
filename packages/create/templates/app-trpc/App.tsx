import {useMemo} from 'react';
import {
  QuiltApp,
  useRoutes,
  useInitialUrl,
  RoutePreloading,
  type PropsWithChildren,
} from '@quilted/quilt';
import {ReactQueryContext} from '@quilted/react-query';
import {QueryClient} from '@tanstack/react-query';
import {httpBatchLink} from '@trpc/client';

import {trpc} from '~/shared/trpc';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
import {Metrics} from './foundation/Metrics';

import {Start} from './features/Start';

export interface Props {}

// The root component for your application. You will typically render any
// app-wide context in this component.
export default function App(props: Props) {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <RoutePreloading>
        <AppContext {...props}>
          <Routes />
        </AppContext>
      </RoutePreloading>
    </QuiltApp>
  );
}

// This component renders the routes for your application. If you have a lot
// of routes, you may want to split this component into its own file.
function Routes() {
  return useRoutes([
    {
      match: '/',
      render: () => <Start />,
      renderPreload: () => <Start.Preload />,
    },
  ]);
}

// This component renders any app-wide context.
function AppContext({children}: PropsWithChildren<Props>) {
  const {queryClient} = useMemo(() => {
    return {
      queryClient: new QueryClient(),
    };
  }, []);

  return (
    <Trpc>
      <ReactQueryContext client={queryClient}>
        <Metrics>{children}</Metrics>
      </ReactQueryContext>
    </Trpc>
  );
}

function Trpc({children}: PropsWithChildren) {
  const initialUrl = useInitialUrl();

  const queryClient = useMemo(() => new QueryClient(), []);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          // We need to use an absolute URL so that queries will
          // work during server-side rendering
          httpBatchLink({url: new URL('/trpc', initialUrl).href}),
        ],
      }),
    [initialUrl],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <ReactQueryContext client={queryClient}>{children}</ReactQueryContext>
    </trpc.Provider>
  );
}
