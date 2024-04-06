import {describe, it, expect} from 'vitest';
import {
  multiline,
  createWorkspace,
  startServer,
  type Page,
} from './utilities.ts';

describe('app builds', () => {
  describe('assets', () => {
    it('loads the assets for each browser build', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

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
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'browser.ts': multiline`
          const element = document.createElement('div');
          element.id = 'app';
          element.textContent = 'Hello, world!';
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

      const element = await page.waitForSelector('#app');

      expect(element).not.toBeNull();
    });

    it('creates a hashed URL pointing to a publicly-served version of the image', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

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
      await using workspace = await createWorkspace({fixture: 'basic-app'});

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
      await using workspace = await createWorkspace({fixture: 'basic-app'});
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

    it('inlines raw file contents into the JavaScript bundle', async () => {
      await using workspace = await createWorkspace({fixture: 'basic-app'});

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
