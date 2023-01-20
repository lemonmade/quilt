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
});
