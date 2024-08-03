import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('app builds', () => {
  describe('browser entry', () => {
    const customBrowserEntryFiles = {
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

        export default quiltApp();
      `,
    };

    it('uses a browser.ts file as the browser entry by default', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({...customBrowserEntryFiles});

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the `browser.entry` option from the rollup plugin as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';  

          const config = quiltApp({
            browser: {entry: './my-custom-browser-entry.ts'},
          });

          export default config;
        `,
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the `input` from Rollup as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';  

          const config = await quiltApp();
          config[0].input = './my-custom-browser-entry.ts';

          export default config;
        `,
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the `exports` field from package.json as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            exports: './my-custom-browser-entry.ts',
          },
          null,
          2,
        ),
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the root `exports` field from package.json as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            exports: {'.': './my-custom-browser-entry.ts'},
          },
          null,
          2,
        ),
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the root `exports.default` field from package.json as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            exports: {'.': {default: './my-custom-browser-entry.ts'}},
          },
          null,
          2,
        ),
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the root `exports.browser` field from package.json as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            exports: {'.': {browser: './my-custom-browser-entry.ts'}},
          },
          null,
          2,
        ),
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the root `exports.source` field from package.json as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            exports: {'.': {source: './my-custom-browser-entry.ts'}},
          },
          null,
          2,
        ),
        'my-custom-browser-entry.ts': customBrowserEntryFiles['browser.ts'],
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });

    it('uses the `main` field from package.json as the browser entry', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const files = {
        ...customBrowserEntryFiles,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            main: './my-custom-browser-entry.ts',
          },
          null,
          2,
        ),
        'extra-browser-entry': multiline`
          const element = document.createElement('main');
          element.textContent = 'Hello world from a custom browser entry!';

          document.body.append(element);
        `,
      };

      delete (files as any)['browser.ts'];

      await workspace.fs.write(files);

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world from a custom browser entry!');
    });
  });

  describe('magic app module', () => {
    it('uses an explicit App module', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
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
  });
});
