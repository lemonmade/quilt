import {describe, it, expect} from 'vitest';
import {multiline, startServer, createWorkspace} from './utilities.ts';

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
        import {useState, useEffect} from 'react';

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

        import {useState} from 'react';
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
        import {useState} from 'react';
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
      'Async.tsx': multiline`
        export default function Async() {
          return <div id="rendered">Hello from an async component!</div>;
        }
      `,
      'App.tsx': multiline`
        import {AsyncContext, AsyncComponent} from '@quilted/quilt/async';

        const Async = AsyncComponent.from(() => import('./Async.tsx'), {
          server: false,
          renderLoading: <div id="loading">Loading...</div>,
        });

        // Ensure that the app works correctly even if the async component is
        // available synchronously on render.
        await Async.load();

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
});
