import {jest, describe, it, expect} from '@quilted/testing';
import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('async', () => {
  it('can server render with an async module', async () => {
    await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
      const {fs} = workspace;

      await fs.write({
        'async.ts': stripIndent`
          export function hello() {
            return 'Hello from an async module!';
          }
        `,
        'App.tsx': stripIndent`
          import {createAsyncModule, useAsyncModule} from '@quilted/quilt';

          const Async = createAsyncModule(() => import('./async'));

          export default function App() {
            const {resolved} = useAsyncModule(Async);

            return <div>{resolved?.hello() ?? 'Loading...'}</div>;
          }
        `,
      });

      const {page} = await buildAppAndOpenPage(workspace, {
        path: '/',
        javaScriptEnabled: false,
      });

      expect(await page.textContent('body')).toMatch(
        `Hello from an async module!`,
      );

      expect(await page.$('script[src^="/assets/async"]')).not.toBeNull();
    });
  });

  it('can server render an async component', async () => {
    await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
      const {fs} = workspace;

      await fs.write({
        'Async.module.css': stripIndent`
          .Async {
            color: purple;
          }
        `,
        'Async.tsx': stripIndent`
          import styles from './Async.module.css';

          export default function Async() {
            return <div className={styles.Async}>Hello from an async component!</div>;
          }
        `,
        'App.tsx': stripIndent`
          import {createAsyncComponent} from '@quilted/quilt';

          const Async = createAsyncComponent(() => import('./Async'));

          export default function App() {
            return <Async />;
          }
        `,
      });

      const {page} = await buildAppAndOpenPage(workspace, {
        path: '/',
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
  });

  it('can server render an async component with deferred hydration', async () => {
    await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
      const {fs} = workspace;

      await fs.write({
        'Async.tsx': stripIndent`
          import {useState, useEffect} from 'react';

          export default function Async() {
            const [active, setActive] = useState(false);

            useEffect(() => {
              setActive(true);
            }, []);

            return (
              <>
                <div>Hello from an async component!</div>
                {active && <div id="hydrated">Hydrated!</div>}
              </>
            );
          }
        `,
        'App.tsx': stripIndent`
          import {createAsyncComponent} from '@quilted/quilt';

          const Async = createAsyncComponent(() => import('./Async'), {
            hydrate: 'defer',
            renderLoading: () => <div>Loading...</div>,
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

      const {page} = await buildAppAndOpenPage(workspace);

      expect(await page.textContent('body')).toMatch(
        `Hello from an async component!`,
      );

      const pageContent = await page.textContent('body');
      expect(pageContent).not.toMatch(`Loading...`);
      expect(pageContent).not.toMatch(`Hydrated!`);

      expect(await page.$('script[src^="/assets/Async"]')).toBeNull();
      expect(
        await page.$('link[rel=moduleprefetch][href^="/assets/Async"]'),
      ).not.toBeNull();

      await page.click('button');

      await page.waitForSelector('#hydrated');

      expect(await page.textContent('body')).toMatch(`Hydrated!`);
    });
  });

  it('can client render an async component with deferred hydration', async () => {
    await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
      const {fs} = workspace;

      await fs.write({
        'Async.tsx': stripIndent`
          export default function Async() {
            return <div id="rendered">Rendered!</div>;
          }
        `,
        'App.tsx': stripIndent`
        import {useState} from 'react';
          import {createAsyncComponent} from '@quilted/quilt';

          const Async = createAsyncComponent(() => import('./Async'), {
            hydrate: 'defer',
            renderLoading: () => <div id="loading">Loading...</div>,
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

      const {page} = await buildAppAndOpenPage(workspace);

      expect(await page.$('script[src^="/assets/Async"]')).toBeNull();
      expect(
        await page.$('link[rel=moduleprefetch][href^="/assets/Async"]'),
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
    });
  });

  it('can client render an async component', async () => {
    await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
      const {fs} = workspace;

      await fs.write({
        'Async.tsx': stripIndent`
          export default function Async() {
            return <div id="rendered">Hello from an async component!</div>;
          }
        `,
        'App.tsx': stripIndent`
          import {createAsyncComponent} from '@quilted/quilt';

          const Async = createAsyncComponent(() => import('./Async'), {
            render: 'client',
            renderLoading: () => {
              console.log('LOADING');
              return <div>Loading...</div>;
            },
          });

          export default function App() {
            return <Async />;
          }
        `,
      });

      const {page: noJSPage} = await buildAppAndOpenPage(workspace, {
        javaScriptEnabled: false,
      });

      const noJSPageContent = await noJSPage.textContent('body');
      expect(noJSPageContent).toMatch(`Loading...`);
      expect(noJSPageContent).not.toMatch(`Hello from an async component!`);

      expect(await noJSPage.$('script[src^="/assets/Async"]')).toBeNull();
      expect(
        await noJSPage.$('link[rel=moduleprefetch][href^="/assets/Async"]'),
      ).not.toBeNull();

      const {page} = await buildAppAndOpenPage(workspace);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.waitForSelector('#rendered');

      expect(await page.textContent('body')).toMatch(
        `Hello from an async component!`,
      );
    });
  });
});
