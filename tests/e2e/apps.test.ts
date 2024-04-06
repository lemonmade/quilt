import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('app builds', () => {
  describe('entry', () => {
    it('uses the `main` field from package.json', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            main: 'MyApp.tsx',
          },
          null,
          2,
        ),
        'MyApp.tsx': multiline`
          export default function App() {
            return <>Hello world</>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('prefers an explicit entry over one from package.json', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            main: 'App.tsx',
          },
          null,
          2,
        ),
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';

          export default quiltApp({app: './MyApp.tsx'});
        `,
        'MyApp.tsx': multiline`
          export default function App() {
            return <>Hello world</>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses an App.tsx file when there is no dedicated entry file', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          export default function App() {
            return <>Hello world</>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses an app.tsx file when there is no dedicated entry file', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.remove('App.tsx');
      await workspace.fs.write({
        'app.tsx': multiline`
          export default function App() {
            return <>Hello world</>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses an index.tsx file when there is no dedicated entry file', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.remove('App.tsx');
      await workspace.fs.write({
        'index.tsx': multiline`
          export default function App() {
            return <>Hello world</>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('supports apps that have completely custom browser entries', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.remove('App.tsx');
      await workspace.fs.write({
        'browser.ts': multiline`
          const element = document.createElement('main');
          element.textContent = 'Hello world';

          document.body.append(element);
        `,
        'server.ts': multiline`
          import {RequestRouter} from '@quilted/quilt/request-router';
          import {renderToResponse} from '@quilted/quilt/server';
          import {BrowserAssets} from 'quilt:module/assets';
                    
          const router = new RequestRouter();
          const assets = new BrowserAssets();

          router.get(async (request) => {
            const response = await renderToResponse({
              request,
              assets,
            });

            return response;
          });
          
          export default router;
        `,
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';  

          export default quiltApp({
            browser: {entry: './browser.ts'},
            server: {entry: './server.ts'},
          });
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.waitForSelector('main');

      expect(await page.evaluate(() => document.body.innerHTML)).toBe(
        '<main>Hello world</main>',
      );
    });
  });
});
