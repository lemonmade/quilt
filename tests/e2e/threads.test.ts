import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('threads', () => {
  describe('ThreadMessagePort', () => {
    it('communicates between message ports', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          export default function App() {
            return null;
          }
        `,
        'browser.ts': multiline`
          import {ThreadMessagePort} from '@quilted/quilt/threads';

          const channel = new MessageChannel();

          const thread1 = new ThreadMessagePort(channel.port1);
          const thread2 = new ThreadMessagePort(channel.port2, {
            exports: {
              sayHello: (name) => 'Hello ' + name,
            },
          });

          channel.port1.start();
          channel.port2.start();

          const greeting = await thread1.imports.sayHello('world');

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
        'App.tsx': multiline`
          export default function App() {
            return <a id="link" href="/greeter" target="_blank">Open greeter page</a>;
          }
        `,
        'browser.ts': multiline`
          import {ThreadBroadcastChannel} from '@quilted/quilt/threads';

          const channel = new BroadcastChannel('my-channel');

          if (window.location.pathname === '/greeter') {
            const thread = new ThreadBroadcastChannel(channel, {
              exports: {
                sayHello: (name) => 'Hello ' + name,
              },
            });
          } else {
            document.querySelector('#link').addEventListener('click', async () => {
              // give it a second to load the other window
              await new Promise((resolve) => setTimeout(resolve, 100));

              const thread = new ThreadBroadcastChannel(channel);

              const greeting = await thread.imports.sayHello('world');

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

  describe('ThreadWindow and ThreadNestedWindow', () => {
    it('communicates between a parent page and a nested window', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          export default function App() {
            return <button id="button" type="button">Open popup</button>;
          }
        `,
        'browser.ts': multiline`
          import {ThreadWindow, ThreadNestedWindow} from '@quilted/quilt/threads';

          if (window.opener) {
            const thread = new ThreadNestedWindow(window.opener, {
              exports: {
                sayHello: (name) => 'Hello ' + name,
              },
            });
          } else {
            document.querySelector('#button').addEventListener('click', async () => {
              const popup = window.open('/popup', 'MyAppPopup', 'popup');
              const thread = new ThreadWindow(popup);

              const greeting = await thread.imports.sayHello('world');

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

      await page.click('#button');
      await page.waitForSelector('#result');

      expect(
        await page.evaluate(() => document.documentElement.textContent),
      ).toContain('Hello world');
    });
  });

  describe('ThreadIFrame and ThreadNestedIframe', () => {
    it('communicates between a parent page and a nested iframe', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          export default function App() {
            return null;
          }
        `,
        'browser.ts': multiline`
          import {ThreadIframe, ThreadNestedIframe} from '@quilted/quilt/threads';

          if (window.parent !== window) {
            const thread = new ThreadNestedIframe({
              exports: {
                sayHello: (name) => 'Hello ' + name,
              },
            });
          } else {
            const iframe = document.createElement('iframe');
            iframe.src = '/iframe';
            document.body.appendChild(iframe);

            const thread = new ThreadIframe(iframe);

            const greeting = await thread.imports.sayHello('world');

            const element = document.createElement('div');
            element.id = 'result';
            element.textContent = String(greeting);
            document.body.appendChild(element);
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
        'App.tsx': multiline`
          export default function App() {
            return null;
          }
        `,
        'browser.ts': multiline`
          import {ThreadWebWorker, createWorker} from '@quilted/quilt/threads';

          const CustomWorker = createWorker(() => import('./worker.ts'));

          const worker = new CustomWorker();
          const thread = new ThreadWebWorker(worker);

          const greeting = await thread.imports.sayHello('world');

          const element = document.createElement('div');
          element.id = 'result';
          element.textContent = String(greeting);
          document.body.appendChild(element);
        `,
        'worker.ts': multiline`
          import {ThreadWebWorker} from '@quilted/threads';

          const thread = new ThreadWebWorker(self, {
            exports: {
              sayHello: (name) => 'Hello ' + name,
            },
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
        'App.tsx': multiline`
          export default function App() {
            return null;
          }
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
