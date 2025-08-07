import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('threads', () => {
  describe('ThreadMessagePort', () => {
    it('communicates between message ports', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'server.tsx': multiline`
          import {Hono} from 'hono';
          import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
          import {BrowserAssets} from 'quilt:module/assets';

          const app = new Hono();
          const assets = new BrowserAssets();

          if (process.env.NODE_ENV === 'production') {
            app.all('/assets/*', serveStaticAppAssets(import.meta.url));
          }

          app.get('/*', async () => {
            const allAssets = await assets.entry();

            const scriptTags = allAssets.scripts.map((script) => {
              return \`<script type="module" src="\${script.source}"></script>\`;
            }).join('');

            return new Response(\`<html><body>\${scriptTags}</body></html>\`, {
              headers: {'Content-Type': 'text/html'},
            });
          });
          
          export default app;
        `,
        'browser.ts': multiline`
          import {ThreadMessagePort} from '@quilted/quilt/threads';

          const channel = new MessageChannel();

          const {sayHello} = ThreadMessagePort.import(channel.port1);
          const thread2 = ThreadMessagePort.export(channel.port2, {
            sayHello: (name) => 'Hello ' + name,
          });

          channel.port1.start();
          channel.port2.start();

          const greeting = await sayHello('world');

          const element = document.createElement('div');
          element.id = 'result';
          element.textContent = String(greeting);
          document.body.appendChild(element);
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });
  });

  // TODO: these are flaky, I suspect there are timing issues with creating the different tabs/
  // channels.
  // @see https://github.com/lemonmade/quilt/issues/849
  describe.skip('ThreadBroadcastChannel', () => {
    it('communicates between broadcast channel instances', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'server.tsx': multiline`
          import {Hono} from 'hono';
          import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
          import {renderAppToHTMLResponse} from '@quilted/quilt/server';
          import {BrowserAssets} from 'quilt:module/assets';

          const app = new Hono();
          const assets = new BrowserAssets();

          if (process.env.NODE_ENV === 'production') {
            app.all('/assets/*', serveStaticAppAssets(import.meta.url));
          }

          function App() {
            return <a id="link" href="/greeter" target="_blank">Open greeter page</a>;
          }
          
          app.get('/*', async (c) => {
            const request = c.req.raw;

            const response = await renderAppToHTMLResponse(<App />, {
              request,
              assets,
            });

            return response;
          });

          export default app;
        `,
        'browser.ts': multiline`
          import {ThreadBroadcastChannel} from '@quilted/quilt/threads';

          const channel = new BroadcastChannel('my-channel');

          if (window.location.pathname === '/greeter') {
            const {sayHello} = ThreadBroadcastChannel.import(channel);

            ThreadBroadcastChannel.export(channel, {
              sayHello: (name) => 'Hello ' + name,
            });
          } else {
            document.querySelector('#link').addEventListener('click', async () => {
              // give it a second to load the other window
              await new Promise((resolve) => setTimeout(resolve, 100));

              const {sayHello} = ThreadBroadcastChannel.import(channel);

              const greeting = await sayHello('world');

              const element = document.createElement('div');
              element.id = 'result';
              element.textContent = String(greeting);
              document.body.appendChild(element);
            });
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.click('#link');
      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toContain('Hello world');
    });
  });

  describe('ThreadWindow', () => {
    it('communicates between a parent page and a nested window', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'server.tsx': multiline`
          import {Hono} from 'hono';
          import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
          import {renderAppToHTMLResponse} from '@quilted/quilt/server';
          import {BrowserAssets} from 'quilt:module/assets';

          const app = new Hono();
          const assets = new BrowserAssets();

          if (process.env.NODE_ENV === 'production') {
            app.all('/assets/*', serveStaticAppAssets(import.meta.url));
          }

          function App() {
            return <button id="button" type="button">Open popup</button>;
          }
          
          app.get('/*', async (c) => {
            const request = c.req.raw;

            const response = await renderAppToHTMLResponse(<App />, {
              request,
              assets,
            });

            return response;
          });

          export default app;
        `,
        'browser.ts': multiline`
          import {ThreadWindow, ThreadNestedWindow} from '@quilted/quilt/threads';

          if (window.opener) {
            const {connect} = ThreadWindow.opener.import();

            await connect({
              async sayHello(name) { return 'Hello ' + name; },
            });
          } else {
            document.querySelector('#button').addEventListener('click', async () => {
              const popup = window.open('/popup', 'MyAppPopup', 'popup');

              ThreadWindow.export(popup, {
                async connect({sayHello}) {
                  const greeting = await sayHello('world');

                  const element = document.createElement('div');
                  element.id = 'result';
                  element.textContent = String(greeting);
                  document.body.append(element);
                },
              });
            });
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.click('#button');
      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toContain('Hello world');
    });

    it('communicates between a parent page and a nested iframe', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'server.tsx': multiline`
          import {Hono} from 'hono';
          import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
          import {BrowserAssets} from 'quilt:module/assets';

          const app = new Hono();
          const assets = new BrowserAssets();

          if (process.env.NODE_ENV === 'production') {
            app.all('/assets/*', serveStaticAppAssets(import.meta.url));
          }

          app.get('/*', async () => {
            const allAssets = await assets.entry();

            const scriptTags = allAssets.scripts.map((script) => {
              return \`<script type="module" src="\${script.source}"></script>\`;
            }).join('');

            return new Response(\`<html><body>\${scriptTags}</body></html>\`, {
              headers: {'Content-Type': 'text/html'},
            });
          });
          
          export default app;
        `,
        'browser.ts': multiline`
          import {ThreadWindow} from '@quilted/quilt/threads';

          if (window.parent !== window) {
            const {connect} = ThreadWindow.parent.import();

            await connect({
              async sayHello(name) { return 'Hello ' + name; },
            });
          } else {
            const iframe = document.createElement('iframe');
            iframe.src = '/iframe';
            document.body.append(iframe);

            ThreadWindow.iframe.export(iframe, {
              async connect({sayHello}) {
                const greeting = await sayHello('world');

                const element = document.createElement('div');
                element.id = 'result';
                element.textContent = String(greeting);
                document.body.append(element);
              },
            });
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });
  });

  describe('ThreadWebWorker', () => {
    it('communicates between two message ports', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'server.tsx': multiline`
          import {Hono} from 'hono';
          import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
          import {BrowserAssets} from 'quilt:module/assets';

          const app = new Hono();
          const assets = new BrowserAssets();

          if (process.env.NODE_ENV === 'production') {
            app.all('/assets/*', serveStaticAppAssets(import.meta.url));
          }

          app.get('/*', async () => {
            const allAssets = await assets.entry();

            const scriptTags = allAssets.scripts.map((script) => {
              return \`<script type="module" src="\${script.source}"></script>\`;
            }).join('');

            return new Response(\`<html><body>\${scriptTags}</body></html>\`, {
              headers: {'Content-Type': 'text/html'},
            });
          });
          
          export default app;
        `,
        'browser.ts': multiline`
          import {ThreadWebWorker, createWorker} from '@quilted/quilt/threads';

          const CustomWorker = createWorker(() => import('./worker.ts'));

          const worker = new CustomWorker();
          const {sayHello} = ThreadWebWorker.import(worker);

          const greeting = await sayHello('world');

          const element = document.createElement('div');
          element.id = 'result';
          element.textContent = String(greeting);
          document.body.append(element);
        `,
        'worker.ts': multiline`
          import {ThreadWebWorker} from '@quilted/threads';

          ThreadWebWorker.self.export({
            async sayHello(name) { return 'Hello ' + name; },
          });
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });
  });

  // Still no good way of hosting the service worker on the root automatically.
  describe.todo('ThreadServiceWorker', () => {
    it('communicates between main thread and service worker', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';  

          const config = quiltApp({
            serviceWorker: {entry: './service-worker.ts'},
          });

          export default config;
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

          app.get('/*', async () => {
            const allAssets = await assets.entry();

            const scriptTags = allAssets.scripts.map((script) => {
              return \`<script type="module" src="\${script.source}"></script>\`;
            }).join('');

            return new Response(\`<html><body>\${scriptTags}</body></html>\`, {
              headers: {'Content-Type': 'text/html'},
            });
          });
          
          export default app;
        `,
        'browser.ts': multiline`
          import {ThreadServiceWorker} from '@quilted/threads';

          await navigator.serviceWorker.register('/service-worker.js');

          if (navigator.serviceWorker.controller) {
            const thread = new ThreadServiceWorker(navigator.serviceWorker.controller);
          }
          const thread2 = new ThreadMessagePort(channel.port2, {
            exports: {
              sayHello: (name) => 'Hello ' + name,
            },
          });

          const greeting = await thread1.imports.sayHello('world');

          const element = document.createElement('div');
          element.id = 'result';
          element.textContent = String(greeting);
          document.body.appendChild(element);
        `,
        'service-worker.ts': multiline`
          import {ThreadsFromServiceWorkerClients} from '@quilted/threads';

          const clientThreads = new ThreadsFromServiceWorkerClients();

          self.addEventListener('activate', async (event) => {
            const clients = await serviceWorker.clients.matchAll();
            const thread = clientThreads.create(clients[0], {
              exports: {
                sayHello: (name) => 'Hello ' + name,
              },
            });
          });
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toBe('Hello world');
    });
  });
});
