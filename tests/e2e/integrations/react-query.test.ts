import {describe, it, expect} from 'vitest';
import {multiline, Workspace, startServer} from '../utilities.ts';

describe('react-query', () => {
  it('can server and client render a query using suspense', async () => {
    await using workspace = await Workspace.create({fixture: 'basic-app'});

    await workspace.fs.write({
      'App.tsx': multiline`
        import {Suspense} from 'preact/compat';
        import {useMemo} from 'preact/hooks';
        import {QueryClient, useSuspenseQuery} from '@tanstack/react-query';
        import {ReactQueryContext} from '@quilted/react-query';
        import {useBrowserRequest} from '@quilted/quilt/browser';
        
        export function App() {
          const client = useMemo(() => new QueryClient(), []);
        
          return (
            <ReactQueryContext client={client}>
              <Suspense fallback={null}>
                <UI />
              </Suspense>
            </ReactQueryContext>
          );
        }

        export default App;

        function UI() {
          const {url} = useBrowserRequest();

          const {data} = useSuspenseQuery({
            queryKey: ['api', {name: 'Winston'}],
            queryFn: async () => {
              const requestURL = new URL('/api', url);
              requestURL.searchParams.set('name', 'Winston');
              const response = await fetch(requestURL);
              return await response.json();
            },
          });

          return <pre>{JSON.stringify(data)}</pre>;
        }
      `,
      'server.tsx': multiline`
        import {Hono} from 'hono';
        import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
        import {BrowserAssets} from 'quilt:module/assets';
        
        const app = new Hono();
        const assets = new BrowserAssets();

        if (process.env.NODE_ENV === 'production') {
          app.all('/assets/*', serveStaticAppAssets(import.meta.url));
        }

        app.get('/api', (c) => {
          const url = new URL(c.req.raw.url);

          return Response.json({
            hello: url.searchParams.get('name') ?? 'world',
          });
        });
        
        app.get('/*', async (c) => {
          const request = c.req.raw;

          const [{App}, {renderAppToHTMLResponse}] = await Promise.all([
            import('./App.tsx'),
            import('@quilted/quilt/server'),
          ]);
        
          const response = await renderAppToHTMLResponse(<App />, {
            request,
            assets,
          });
        
          return response;
        });

        export default app;
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    expect(await page.textContent('pre')).toBe(
      JSON.stringify({hello: 'Winston'}),
    );
  });
});
