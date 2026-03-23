import {describe, it, expect} from 'vitest';
import {multiline, startServer, Workspace} from './utilities.ts';

describe('graphql', () => {
  it('serializes initial GraphQL query results into the DOM and does not refetch on page load', async () => {
    await using workspace = await Workspace.create({fixture: 'basic-app'});

    await workspace.fs.write({
      'server.tsx': multiline`
        import {Hono} from 'hono';
        import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
        import {renderAppToHTMLResponse} from '@quilted/quilt/server';

        import {BrowserAssets} from 'quilt:module/assets';

        import App from './App.tsx';

        const app = new Hono();
        const assets = new BrowserAssets();

        if (process.env.NODE_ENV === 'production') {
          app.all('/assets/*', serveStaticAppAssets(import.meta.url));
        }

        app.post('/graphql', async (c) => {
          return c.json({data: {greeting: 'Hello from GraphQL!'}});
        });

        app.get('*', async (c) => {
          const request = c.req.raw;

          const response = await renderAppToHTMLResponse(<App />, {
            request,
            assets,
          });

          return response;
        });

        export default app;
      `,
      'App.tsx': multiline`
        import {useMemo} from 'preact/hooks';
        import {Suspense} from 'preact/compat';
        import {useBrowserRequest} from '@quilted/quilt/browser';
        import {AsyncActionCache} from '@quilted/quilt/async';
        import {QuiltFrameworkContext} from '@quilted/quilt/context';
        import {createGraphQLFetch, GraphQLCache, useGraphQLQuery} from '@quilted/quilt/graphql';

        const GreetingQuery = 'query Greeting { greeting }';

        export default function App() {
          const {url} = useBrowserRequest();

          const graphql = useMemo(() => {
            const fetchGraphQL = createGraphQLFetch({
              url: new URL('/graphql', url),
            });
            const cache = new GraphQLCache({fetch: fetchGraphQL});
            return {fetch: fetchGraphQL, cache};
          }, []);

          return (
            <QuiltFrameworkContext graphql={graphql} async={{cache: new AsyncActionCache()}}>
              <Suspense fallback={<div>Loading...</div>}>
                <Greeting />
              </Suspense>
            </QuiltFrameworkContext>
          );
        }

        function Greeting() {
          const query = useGraphQLQuery(GreetingQuery, {cache: true, suspend: true});
          return <div id="greeting">{query.value?.data?.greeting}</div>;
        }
      `,
    });

    const server = await startServer(workspace);

    // 1. Verify the GraphQL data is rendered in the page
    const page = await server.openPage('/');
    const greetingText = await page.textContent('#greeting');
    expect(greetingText).toBe('Hello from GraphQL!');

    // 2. Verify the GraphQL cache serialization is in the DOM
    const serialization = await page.getAttribute(
      'browser-serialization[name="quilt:graphql"]',
      'content',
    );
    expect(serialization).toBeTruthy();
    expect(serialization).toContain('Hello from GraphQL!');

    // 3. Verify no GraphQL network request is made on a fresh page load
    // (the client should hydrate from the serialized cache)
    const graphqlRequests: string[] = [];
    const freshPage = await server.openPage('/', {
      async customizeContext(context) {
        await context.route('**/graphql', async (route) => {
          graphqlRequests.push(route.request().url());
          await route.continue();
        });
      },
    });

    // Wait a moment for any potential network requests to fire
    await freshPage.waitForTimeout(1000);

    const freshGreetingText = await freshPage.textContent('#greeting');
    expect(freshGreetingText).toBe('Hello from GraphQL!');
    expect(graphqlRequests).toHaveLength(0);
  });
});
