import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from '../utilities.ts';

describe('trpc', () => {
  it('can server and client render a trpc suspense query', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    await workspace.fs.write({
      'trpc.ts': multiline`
        import {initTRPC} from '@trpc/server';

        const t = initTRPC.create();

        export const appRouter = t.router({
          message: t.procedure
            .input((v) => {
              if (typeof v === 'string') return v;
              throw new Error('Invalid input: Expected string');
            })
            .query(({input}) => \`Hello \${input}!\`),
        });

        export type AppRouter = typeof appRouter;

        export const createCaller = t.createCallerFactory(appRouter);
      `,
      'App.tsx': multiline`
        import {Suspense} from 'preact/compat';
        import {useMemo} from 'preact/hooks';
        import {QueryClient} from '@tanstack/react-query';
        import {createTRPCReact} from '@trpc/react-query';
        import {httpBatchLink} from '@trpc/client';
        import {ReactQueryContext} from '@quilted/react-query';
        import {useBrowserRequest} from '@quilted/quilt/browser';

        import type {AppRouter} from './trpc.ts';

        export const trpc = createTRPCReact<AppRouter>();

        export function App({trpcClient, queryClient}) {
          return (
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
              <ReactQueryContext client={queryClient}>
                <Suspense fallback={null}>
                  <UI />
                </Suspense>
              </ReactQueryContext>
            </trpc.Provider>
          );
        }

        export default App;

        function UI() {
          const [data] = trpc.message.useSuspenseQuery('world');
          return <div>{data}</div>;
        }
      `,
      'browser.tsx': multiline`
        import '@quilted/quilt/globals';
        import {hydrate} from '@quilted/quilt/browser';
        import {httpBatchLink} from '@trpc/client';
        import {QueryClient} from '@tanstack/react-query';

        import {App, trpc} from './App.tsx';

        const element = document.querySelector('#app')!;

        const trpcClient = trpc.createClient({
          links: [
            httpBatchLink({
              url: new URL('/api').href,
            }),
          ],
        });

        const queryClient = new QueryClient();

        hydrate(
          <App trpcClient={trpcClient} queryClient={queryClient} />,
        );
      `,
      'server.tsx': multiline`
        import '@quilted/quilt/globals';
        import {RequestRouter, JSONResponse} from '@quilted/quilt/request-router';
        import {renderToResponse} from '@quilted/quilt/server';
        import {fetchRequestHandler} from '@trpc/server/adapters/fetch';

        import {BrowserAssets} from 'quilt:module/assets';
        
        import {appRouter, createCaller} from './trpc.ts';
        
        const router = new RequestRouter();
        const assets = new BrowserAssets();

        router.any('/api', (request) => {
          return fetchRequestHandler({
            endpoint: '/api',
            req: request,
            router: appRouter,
            createContext: () => ({}),
          });
        }, {exact: false});
        
        router.get(async (request) => {
          const [{App}, {createDirectClient}, {QueryClient}] = await Promise.all([
            import('./App.tsx'),
            import('@quilted/trpc/server'),
            import('@tanstack/react-query'),
          ]);

          const queryClient = new QueryClient();
          const trpcClient = createDirectClient(appRouter);
          
          const response = await renderToResponse(
            <App trpcClient={trpcClient} queryClient={queryClient} />,
            {
              request,
              assets,
            },
          );
        
          return response;
        });

        export default router;
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    expect(await page.textContent('div')).toBe('Hello world!');
  });
});
