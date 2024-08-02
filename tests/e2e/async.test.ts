import {describe, it, expect} from 'vitest';
import {multiline, startServer, createWorkspace, Page} from './utilities.ts';

interface TestHarness {
  waiting:
    | (Promise<unknown> & {
        resolve(value: unknown): void;
        reject(error: unknown): void;
      })
    | undefined;
  waitForTest(): Promise<unknown>;
}

declare module globalThis {
  const testHarness: TestHarness;
}

describe('async', () => {
  it('can server render with an async module', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'async.ts': multiline`
        export function hello() {
          return 'Hello from an async module!';
        }
      `,
      'App.tsx': multiline`
        import {AsyncModule, useAsyncModule} from '@quilted/quilt/async';

        const Async = new AsyncModule(() => import('./async.ts'));

        export default function App() {
          const {module} = useAsyncModule(Async);

          return <div>{module.hello()}</div>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/', {
      javaScriptEnabled: false,
    });

    expect(await page.textContent('body')).toMatch(
      `Hello from an async module!`,
    );

    expect(await page.$('script[src^="/assets/async"]')).not.toBeNull();
  });

  it('can server render an async component', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'Async.module.css': multiline`
        .Async {
          color: purple;
        }
      `,
      'Async.tsx': multiline`
        import styles from './Async.module.css';

        export default function Async() {
          return <div className={styles.Async}>Hello from an async component!</div>;
        }
      `,
      'App.tsx': multiline`
        import {AsyncComponent} from '@quilted/quilt/async';

        const Async = AsyncComponent.from(() => import('./Async.tsx'));

        export default function App() {
          return <Async />;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/', {
      javaScriptEnabled: false,
    });

    expect(await page.textContent('body')).toMatch(
      `Hello from an async component!`,
    );

    expect(
      await page.$('link[rel=stylesheet][href^="/assets/Async"]'),
    ).not.toBeNull();

    expect(await page.$('script[src^="/assets/Async"]')).not.toBeNull();
  });

  it('can server render an async component with deferred hydration', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});
    await workspace.fs.write({
      'Async.module.css': multiline`
        .Async {
          color: purple;
        }
      `,
      'Async.tsx': multiline`
        import {useState, useEffect} from 'preact/hooks';

        import styles from './Async.module.css';

        export default function Async() {
          const [active, setActive] = useState(false);

          useEffect(() => {
            setActive(true);
          }, []);

          return (
            <>
              <div className={styles.Async}>Hello from an async component!</div>
              {active && <div id="hydrated">Hydrated!</div>}
            </>
          );
        }
      `,
      'App.tsx': multiline`
        import {AsyncComponent} from '@quilted/quilt/async';

        const Async = AsyncComponent.from(() => import('./Async.tsx'), {
          client: 'defer',
          renderLoading: <div>Loading...</div>,
        });

        export default function App() {
          return (
            <>
              <Async />
              <button onClick={() => Async.load()}>Preload</button>
            </>
          );
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    expect(await page.textContent('body')).toMatch(
      `Hello from an async component!`,
    );

    const pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(`Loading...`);
    expect(pageContent).not.toMatch(`Hydrated!`);

    expect(
      await page.$('link[rel=stylesheet][href^="/assets/Async"]'),
    ).not.toBeNull();
    expect(await page.$('script[src^="/assets/Async"]')).toBeNull();
    expect(
      await page.$('link[rel=modulepreload][href^="/assets/Async"]'),
    ).not.toBeNull();

    await page.click('button');

    await page.waitForSelector('#hydrated');

    expect(await page.textContent('body')).toMatch(`Hydrated!`);
  });

  it('can client render an async component', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'Async.module.css': multiline`
        .Async {
          color: purple;
        }
      `,
      'Async.tsx': multiline`
        import styles from './Async.module.css';

        export default function Async() {
          return <div className={styles.Async} id="rendered">Rendered!</div>;
        }
      `,
      'App.tsx': multiline`
        import '@quilted/quilt/globals';

        import {useState} from 'preact/hooks';
        import {AsyncComponent} from '@quilted/quilt/async';

        const Async = AsyncComponent.from(() => import('./Async.tsx'), {
          renderLoading: <div id="loading">Loading...</div>,
        });

        export default function App() {
          const [rendered, setRendered] = useState(false);

          return (
            <>
              {rendered && <Async />}
              <button id="render" onClick={() => setRendered(true)}>Render</button>
            </>
          );
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    expect(
      await page.$('link[rel=stylesheet][href^="/assets/Async"]'),
    ).toBeNull();
    expect(await page.$('script[src^="/assets/Async"]')).toBeNull();
    expect(
      await page.$('link[rel=modulepreload][href^="/assets/Async"]'),
    ).toBeNull();

    let pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(`Loading...`);
    expect(pageContent).not.toMatch(`Rendered!`);

    await page.click('button#render');
    await page.waitForSelector('#rendered');

    pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(`Loading...`);
    expect(pageContent).toMatch(`Rendered!`);

    expect(
      await page.$('link[rel=stylesheet][href^="/assets/Async"]'),
    ).not.toBeNull();
  });

  it('can client render an async component with deferred hydration', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});
    await workspace.fs.write({
      'Async.module.css': multiline`
        .Async {
          color: purple;
        }
      `,
      'Async.tsx': multiline`
        import styles from './Async.module.css';

        export default function Async() {
          return <div className={styles.Async} id="rendered">Rendered!</div>;
        }
      `,
      'App.tsx': multiline`
        import {useState} from 'preact/hooks';
        import {AsyncComponent} from '@quilted/quilt/async';

        const Async = AsyncComponent.from(() => import('./Async.tsx'), {
          client: 'defer',
          renderLoading: <div id="loading">Loading...</div>,
        });

        export default function App() {
          const [rendered, setRendered] = useState(false);

          return (
            <>
              {rendered && <Async />}
              <button id="render" onClick={() => setRendered(true)}>Render</button>
              <button id="load" onClick={() => Async.load()}>Load</button>
            </>
          );
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    expect(
      await page.$('link[rel=stylesheet][href^="/assets/Async"]'),
    ).toBeNull();
    expect(await page.$('script[src^="/assets/Async"]')).toBeNull();
    expect(
      await page.$('link[rel=modulepreload][href^="/assets/Async"]'),
    ).toBeNull();

    let pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(`Loading...`);
    expect(pageContent).not.toMatch(`Rendered!`);

    await page.click('button#render');
    await page.waitForSelector('#loading');

    pageContent = await page.textContent('body');
    expect(pageContent).toMatch(`Loading...`);
    expect(pageContent).not.toMatch(`Rendered!`);

    await page.click('button#load');
    await page.waitForSelector('#rendered');

    pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(`Loading...`);
    expect(pageContent).toMatch(`Rendered!`);

    expect(
      await page.$('link[rel=stylesheet][href^="/assets/Async"]'),
    ).not.toBeNull();
  });

  it('can client render a client-only async component', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'browser.tsx': multiline`
        import '@quilted/quilt/globals';
        import {hydrate} from 'preact';
        import App, {Async} from './App.tsx';

        // Ensure that the app works correctly even if the async component is
        // available synchronously on render.
        await Async.load();
        
        const element = document.querySelector('#app')!;
        
        hydrate(<App />, element);
      `,
      'Async.tsx': multiline`
        export default function Async() {
          return <div id="rendered">Hello from an async component!</div>;
        }
      `,
      'App.tsx': multiline`
        import {AsyncContext, AsyncComponent} from '@quilted/quilt/async';

        export const Async = AsyncComponent.from(() => import('./Async.tsx'), {
          server: false,
          renderLoading: <div id="loading">Loading...</div>,
        });

        export default function App() {
          return <AsyncContext><Async /></AsyncContext>;
        }
      `,
    });

    const server = await startServer(workspace);
    const noJSPage = await server.openPage('/', {
      javaScriptEnabled: false,
    });

    const noJSPageContent = await noJSPage.textContent('body');
    expect(noJSPageContent).toMatch(`Loading...`);
    expect(noJSPageContent).not.toMatch(`Hello from an async component!`);

    expect(await noJSPage.$('script[src^="/assets/Async"]')).toBeNull();
    expect(
      await noJSPage.$('link[rel=modulepreload][href^="/assets/Async"]'),
    ).not.toBeNull();

    const page = await server.openPage('/', {
      javaScriptEnabled: true,
    });

    await page.waitForSelector('#rendered');

    expect(await page.textContent('body')).toMatch(
      `Hello from an async component!`,
    );
  });

  it('can server render with references to normal, async-imported modules', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'async.ts': multiline`
        export function hello() {
          return 'Hello from an async module!';
        }
      `,
      'App.tsx': multiline`
        import {useEffect, useState} from 'preact/hooks';
        import {useModuleAssets} from '@quilted/quilt/server';

        export default function App() {
          const [value, setValue] = useState();
          useEffect(() => {
            (async () => {
              const {hello} = await import('./async.ts');
              setValue(value);
            })();
          });

          useModuleAssets('async.ts', {
            scripts: 'preload',
          });

          return <div>{value ?? 'Loading message...'}</div>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/', {
      javaScriptEnabled: false,
    });

    expect(await page.textContent('body')).toMatch(`Loading message...`);

    expect(
      await page.$('link[rel=modulepreload][href^="/assets/async"]'),
    ).not.toBeNull();
  });

  it('can server render components using an async fetch', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    await workspace.fs.write({
      'server.tsx': multiline`
        import '@quilted/quilt/globals';
        import {RequestRouter} from '@quilted/quilt/request-router';
        import {renderToResponse} from '@quilted/quilt/server';
        
        import {BrowserAssets} from 'quilt:module/assets';

        import App from './App.tsx';
        
        const router = new RequestRouter();
        const assets = new BrowserAssets();

        router.get('/data', async () => {
          return new Response('Hello world!');
        });
        
        // For all GET requests, render our React application.
        router.get(async (request) => {
          const response = await renderToResponse(<App />, {
            request,
            assets,
          });
        
          return response;
        });
        
        export default router;
      
      `,
      'App.tsx': multiline`
        import {useMemo} from 'preact/hooks';
        import {Suspense} from 'preact/compat';
        import {useBrowserRequest} from '@quilted/quilt/browser';
        import {
          useAsync,
          AsyncContext,
          AsyncActionCache,
        } from '@quilted/quilt/async';
        
        export default function App() {
          const cache = useMemo(() => new AsyncActionCache(), []);

          return (
            <AsyncContext cache={cache}>
              <Suspense fallback={null}>
                <Async />
              </Suspense>
            </AsyncContext>
          );
        }

        function Async() {
          const {url} = useBrowserRequest();

          const fetched = useAsync(async () => {
            const response = await fetch(new URL('/data', url));
            const text = await response.text();
            return text;
          }, {key: 'data'});
        
          return <div>{fetched.value}</div>
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');

    const content = await page.textContent('body');
    expect(content).toBe(`Hello world!`);
  });

  it('can server render multiple async fetches using separate cache keys', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    await workspace.fs.write({
      'server.tsx': multiline`
        import '@quilted/quilt/globals';
        import {RequestRouter} from '@quilted/quilt/request-router';
        import {renderToResponse} from '@quilted/quilt/server';
        
        import {BrowserAssets} from 'quilt:module/assets';

        import App from './App.tsx';
        
        const router = new RequestRouter();
        const assets = new BrowserAssets();

        router.get('/data', async (request) => {
          const greet = request.URL.searchParams.get('name') ?? 'world';
          return new Response('Hello ' + greet + '!');
        });
        
        // For all GET requests, render our React application.
        router.get(async (request) => {
          const response = await renderToResponse(<App />, {
            request,
            assets,
          });
        
          return response;
        });
        
        export default router;
      
      `,
      'App.tsx': multiline`
        import {useMemo} from 'preact/hooks';
        import {Suspense} from 'preact/compat';
        import {useBrowserRequest} from '@quilted/quilt/browser';
        import {
          AsyncContext,
          AsyncActionCache,
          useAsync,
        } from '@quilted/quilt/async';
        
        export default function App() {
          const cache = useMemo(() => new AsyncActionCache(), []);

          return (
            <AsyncContext cache={cache}>
              <Suspense fallback={null}>
                <Greeting name="Winston" />
              </Suspense>
              {' '}
              <Suspense fallback={null}>
                <Greeting name="Molly" />
              </Suspense>
            </AsyncContext>
          );
        }

        function Greeting({name}: {name: string}) {
          const {value} = useGreeting(name);
          return <div>{value}</div>;
        }

        function useGreeting(name: string) {
          const {url} = useBrowserRequest();

          const fetched = useAsync(async () => {
            const apiURL = new URL('/data', url);
            apiURL.searchParams.set('name', name);
            const response = await fetch(apiURL);
            const text = await response.text();
            return text;
          }, {key: ['greeting', name]});

          return fetched;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');

    const content = await page.textContent('body');
    expect(content).toBe(`Hello Winston! Hello Molly!`);
  });

  const BROWSER_ENTRY_WITH_TEST_RPC = multiline`
    import {hydrate} from 'preact';
    import {Suspense} from 'preact/compat';
    
    import {AsyncContext, AsyncActionCache} from '@quilted/quilt/async';

    import App from './App.tsx';

    const element = document.querySelector('#app')!;

    const context = {
      asyncCache: new AsyncActionCache(),
    };

    const testHarness = {
      waiting: undefined,
      waitForTest() {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
          resolve = (value) => {
            testHarness.waiting = undefined;
            res(value);
          };
          reject = (reason) => {
            testHarness.waiting = undefined;
            rej(reason);
          };
        });
        Object.assign(promise, {resolve, reject});

        testHarness.waiting = promise;

        return promise;
      },
    };

    Object.assign(globalThis, {app: {context}, testHarness});
    
    hydrate(
      <AsyncContext cache={context.asyncCache}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </AsyncContext>,
      element,
    );
  `;

  async function waitForPendingPromise(page: Page) {
    await page.waitForFunction(() => globalThis.testHarness.waiting != null);
  }

  it('can retry async fetches with useAsyncRetry()', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    await workspace.fs.write({
      'browser.tsx': BROWSER_ENTRY_WITH_TEST_RPC,
      'App.tsx': multiline`
        import {
          useAsync,
          useAsyncRetry,
        } from '@quilted/quilt/async';

        export default function App() {
          const fetched = useAsync(async () => {
            const value = await globalThis.testHarness.waitForTest();
            return value;
          }, {
            key: 'data',
            active: typeof document === 'object',
            cache: typeof document === 'object',
          });

          useAsyncRetry(fetched);

          if (fetched.error) {
            return <div>{fetched.error.message}</div>;
          }

          if (fetched.status === 'pending') {
            return <div>Loading...</div>;
          }
        
          return <div>{fetched.value}</div>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');

    const content = await page.textContent('body');
    expect(content).toBe(`Loading...`);

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.reject(
        new Error('Something went wrong!'),
      ),
    );

    const errorContent = await page.textContent('body');
    expect(errorContent).toBe(`Something went wrong!`);

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.resolve('Hello!'),
    );
    expect(await page.textContent('body')).toBe(`Hello!`);
  });

  it('retries async actions three times by default', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    await workspace.fs.write({
      'browser.tsx': BROWSER_ENTRY_WITH_TEST_RPC,
      'App.tsx': multiline`
        import {
          useAsync,
          useAsyncRetry,
        } from '@quilted/quilt/async';

        export default function App() {
          const fetched = useAsync(async () => {
            const value = await globalThis.testHarness.waitForTest();
            return value;
          }, {
            key: 'data',
            active: typeof document === 'object',
            cache: typeof document === 'object',
          });

          useAsyncRetry(fetched);

          if (fetched.error) {
            return <div>{fetched.error.message}</div>;
          }

          if (fetched.status === 'pending') {
            return <div>Loading...</div>;
          }
        
          return <div>{fetched.value}</div>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.reject(new Error('Error 1')),
    );

    const content1 = await page.textContent('body');
    expect(content1).toBe(`Error 1`);

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.reject(new Error('Error 2')),
    );

    const content2 = await page.textContent('body');
    expect(content2).toBe(`Error 2`);

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.reject(new Error('Error 3')),
    );

    const content3 = await page.textContent('body');
    expect(content3).toBe(`Error 3`);

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.reject(new Error('Error 4')),
    );

    const content4 = await page.textContent('body');
    expect(content4).toBe(`Error 4`);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      await page.evaluate(() => globalThis.testHarness.waiting == null),
    ).toBe(true);
  });

  it('can retry a custom number of times', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    const limit = 10;

    await workspace.fs.write({
      'browser.tsx': BROWSER_ENTRY_WITH_TEST_RPC,
      'App.tsx': multiline`
        import {
          useAsync,
          useAsyncRetry,
        } from '@quilted/quilt/async';

        export default function App() {
          const fetched = useAsync(async () => {
            const value = await globalThis.testHarness.waitForTest();
            return value;
          }, {
            key: 'data',
            active: typeof document === 'object',
            cache: typeof document === 'object',
          });

          useAsyncRetry(fetched, {limit: ${limit}});

          if (fetched.error) {
            return <div>{fetched.error.message}</div>;
          }

          if (fetched.status === 'pending') {
            return <div>Loading...</div>;
          }
        
          return <div>{fetched.value}</div>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');

    for (let i = 1; i <= limit + 1; i++) {
      await waitForPendingPromise(page);
      await page.evaluate(
        (i) => globalThis.testHarness.waiting!.reject(new Error(`Error ${i}`)),
        [i],
      );

      const content = await page.textContent('body');
      expect(content).toBe(`Error ${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      await page.evaluate(() => globalThis.testHarness.waiting == null),
    ).toBe(true);
  });

  it('can rerun async fetches with useAsyncCacheControl()', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-app'});

    await workspace.fs.write({
      'browser.tsx': BROWSER_ENTRY_WITH_TEST_RPC,
      'App.tsx': multiline`
        import {
          useAsync,
          useAsyncCacheControl,
        } from '@quilted/quilt/async';

        export default function App() {
          const fetched = useAsync(async () => {
            const value = await globalThis.testHarness.waitForTest();
            return value;
          }, {
            key: 'data',
            active: typeof document === 'object',
            cache: typeof document === 'object',
          });

          useAsyncCacheControl(fetched, {maxAge: 100});

          if (fetched.error) {
            return <div>{fetched.error.message}</div>;
          }

          if (fetched.status === 'pending') {
            return <div>Loading...</div>;
          }
        
          return <div>{fetched.value}</div>;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.resolve('Hello 1!'),
    );
    expect(await page.textContent('body')).toBe(`Hello 1!`);

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(
      await page.evaluate(() => globalThis.testHarness.waiting == null),
    ).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await waitForPendingPromise(page);
    await page.evaluate(() =>
      globalThis.testHarness.waiting!.resolve('Hello 2!'),
    );
    expect(await page.textContent('body')).toBe(`Hello 2!`);

    await new Promise((resolve) => setTimeout(resolve, 125));

    expect(
      await page.evaluate(() => globalThis.testHarness.waiting != null),
    ).toBe(true);
  });

  it('can server render components using route loaders', async () => {
    await using workspace = await createWorkspace({
      fixture: 'basic-app',
      debug: true,
    });

    await workspace.fs.write({
      'App.tsx': multiline`
        import {Navigation} from '@quilted/quilt/navigation';

        const routes = [
          {
            match: '/',
            load: () => Promise.resolve({source: typeof document === 'object' ? 'client' : 'server'}),
            render: (_, {data}) => <div>Data source: {data.source}</div>,
          },
        ];
        
        export default function App() {
          return <Navigation routes={routes} />;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/');
    console.log(await page.innerHTML('html'));

    const content = await page.textContent('body');
    expect(content).toBe(`Data source: server`);
  });
});
