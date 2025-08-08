import {describe, it, expect} from 'vitest';
import {multiline, Workspace, startServer, type Page} from './utilities.ts';

describe('app builds', () => {
  describe('assets', () => {
    it('loads the assets for each browser build', async () => {
      await using workspace = await Workspace.create({fixture: 'empty-app'});

      await workspace.fs.write({
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            browserslist: {
              ie11: ['ie 11'],
              defaults: [
                'defaults and fully supports es6-module-dynamic-import',
              ],
            },
          },
          null,
          2,
        ),
      });

      const server = await startServer(workspace);

      const defaultPage = await server.openPage('/');
      const ie11Page = await server.openPage('/', {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
      });

      expect(
        await defaultPage.$('script[src^="/assets/browser.default"]'),
      ).not.toBeNull();
      expect(
        await ie11Page.$('script[src^="/assets/browser.default"]'),
      ).toBeNull();

      expect(
        await defaultPage.$('script[src^="/assets/browser.ie11"]'),
      ).toBeNull();
      expect(
        await ie11Page.$('script[src^="/assets/browser.ie11"]'),
      ).not.toBeNull();
    });

    it('uses System.js to run a browser build without ESModules', async () => {
      await using workspace = await Workspace.create({fixture: 'empty-app'});

      await workspace.fs.write({
        'browser.ts': multiline`
          const element = document.getElementById('root');
          element.textContent = 'Hello, world!';
          document.body.append(element);
        `,
        'server.tsx': multiline`
          import {Hono} from 'hono';
          import {renderToHTMLResponse, HTML, HTMLPlaceholderEntryAssets} from '@quilted/quilt/server';
          import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
          import {BrowserAssets} from 'quilt:module/assets';

          const app = new Hono();
          const assets = new BrowserAssets();

          if (process.env.NODE_ENV === 'production') {
            app.all('/assets/*', serveStaticAppAssets(import.meta.url));
          }

          app.get('/*', async (c) => {
            const request = c.req.raw;

            const response = await renderToHTMLResponse(<AppHTML />, {
              request,
              assets,
            });

            return response;
          });

          function AppHTML() {
            return (
              <HTML title="Hello world">
                <div id="root" />
                <HTMLPlaceholderEntryAssets />
              </HTML>
            );
          }
          
          export default app;
        `,
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';  

          export default quiltApp({
            browser: {entry: './browser.ts'},
            server: {entry: './server.tsx'},
          });
        `,
        'package.json': JSON.stringify(
          {
            ...JSON.parse(await workspace.fs.read('package.json')),
            browserslist: ['ie 11'],
          },
          null,
          2,
        ),
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
      });

      const element = await page.waitForSelector('#root');

      expect(element).not.toBeNull();
    });

    describe('inline', () => {
      it('allows the developer to inline the built version of specific JavaScript modules', async () => {
        await using workspace = await Workspace.create({fixture: 'empty-app'});

        await workspace.fs.write({
          'inline.ts': multiline`
            document.addEventListener('DOMContentLoaded', async () => {
              const {start} = await import('./async-module');
              start();
            });
          `,
          'async-module.ts': multiline`
            export function start() {
              document.body.innerHTML = '<main>Hello world!</main>';
            }
          `,
          'rollup.config.js': multiline`
            import {quiltApp} from '@quilted/rollup/app';
  
            export default quiltApp({
              browser: {
                entries: {
                  '.': {source: './inline.ts', inline: true},
                },
              },
            });
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

            app.get('/*', async (c) => {
              const request = c.req.raw;

              const {
                renderToHTMLResponse,
                ScriptAssets,
              } = await import('@quilted/quilt/server');

              const {scripts} = assets.entry();

              const response = await renderToHTMLResponse(
                <html>
                  <head>
                    <title>Inline scripts test</title>
                    <ScriptAssets scripts={scripts} />
                  </head>
                  <body></body>
                </html>,
                {request},
              );

              return response;
            });

            export default app;
          `,
        });

        const server = await startServer(workspace);
        const page = await server.openPage();

        console.log(await page.content());

        const scripts = await page.$$('script');
        expect(scripts).toHaveLength(1);

        const content = await scripts[0]?.textContent();
        expect(content).toContain(`import(`);
        expect(content).not.toContain(`Hello world!`);

        await page.waitForSelector('main');
        expect(await page.textContent('main')).toBe('Hello world!');
      });

      it('allows the developer to inline the built version of specific CSS files', async () => {
        await using workspace = await Workspace.create({fixture: 'empty-app'});

        await workspace.fs.write({
          'inline.css': multiline`
            body {
              color: white;
              background-color: black;
            }
          `,
          'rollup.config.js': multiline`
            import {quiltApp} from '@quilted/rollup/app';
  
            export default quiltApp({
              browser: {
                entries: {
                  './inline.css': {source: './inline.css', inline: true},
                },
              },
            });
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

            app.get('/*', async (c) => {
              const request = c.req.raw;

              const {
                renderToHTMLResponse,
                StyleAssets,
                ScriptAssets,
              } = await import('@quilted/quilt/server');

              const {styles, scripts} = assets.entry({id: './inline.css'});

              const response = await renderToHTMLResponse(
                <html>
                  <head>
                    <title>Inline CSS test</title>
                    <StyleAssets styles={styles} />
                    <ScriptAssets scripts={scripts} />
                  </head>
                  <body>
                    Hello world!
                  </body>
                </html>,
                {request},
              );

              return response;
            });

            export default app;
          `,
        });

        const server = await startServer(workspace);
        const page = await server.openPage();

        const styles = await page.$$('style');
        expect(styles).toHaveLength(1);

        const content = await styles[0]?.textContent();
        // Minified verison of the source above
        expect(content).toBe(`body{color:#fff;background-color:#000}`);

        // No scripts should be loaded
        const scripts = await page.$$('script');
        expect(scripts).toHaveLength(0);
      });
    });

    describe('images', () => {
      it('creates a hashed URL pointing to a publicly-served version of the image', async () => {
        await using workspace = await Workspace.create({fixture: 'empty-app'});

        await workspace.fs.write({
          'App.tsx': multiline`
            import image from '../../common/images/lemon.png';
            
            export default function App() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const server = await startServer(workspace);
        const page = await server.openPage();

        expect(await getLoadedImages(page)).toStrictEqual([
          expect.objectContaining({
            url: expect.stringMatching(/[/]assets[/]lemon\.[a-zA-Z0-9]*\.png/),
          }),
        ]);
      });

      it('inlines small images into the JavaScript bundle', async () => {
        await using workspace = await Workspace.create({fixture: 'basic-app'});

        await workspace.fs.write({
          'App.tsx': multiline`
            import image from '../../common/images/lemon-tiny.png';
            
            export default function App() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const server = await startServer(workspace);
        const page = await server.openPage();

        expect(await getLoadedImages(page)).toHaveLength(0);

        const imageSource = await page.evaluate(
          () => document.querySelector('img')?.src,
        );

        expect(imageSource).toMatch('data:image/png;base64,');
      });

      it('lets the developer configure a custom size limit for image inlining', async () => {
        await using workspace = await Workspace.create({fixture: 'basic-app'});
        const {fs} = workspace;

        await fs.write({
          'rollup.config.js': multiline`
            import {quiltApp} from '@quilted/rollup/app';
  
            export default quiltApp({
              assets: {
                inline: {limit: 0},
              },
            });
          `,
          'App.tsx': multiline`
            import image from '../../common/images/lemon-tiny.png';
              
            export default function App() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const server = await startServer(workspace);
        const page = await server.openPage();

        expect(await getLoadedImages(page)).toStrictEqual([
          expect.objectContaining({
            url: expect.stringMatching(
              /[/]assets[/]lemon-tiny\.[a-zA-Z0-9]*\.png/,
            ),
          }),
        ]);
      });

      async function getLoadedImages(page: Page) {
        const images = await page.evaluate(() => {
          return performance.getEntriesByType('resource').flatMap((entry) => {
            if (!/\.(png|jpg|svg)/.test(entry.name)) return [];

            return {
              url: entry.name,
              size: (entry as PerformanceResourceTiming).transferSize,
            };
          });
        });

        return images;
      }
    });

    it('inlines raw file contents into the JavaScript bundle', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'message.txt': 'Hello, world!',
        'App.tsx': multiline`
          import message from './message.txt?raw';

          export default function App() {
            return <div>{message}</div>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).toBe('Hello, world!');
    });
  });
});
