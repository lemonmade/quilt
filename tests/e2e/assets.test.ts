import {describe, it, expect} from 'vitest';
import {
  type Page,
  buildAppAndOpenPage,
  buildAppAndRunServer,
  openPageAndWaitForNavigation,
  stripIndent,
  withWorkspace,
} from './utilities.ts';

describe('app builds', () => {
  describe('assets', () => {
    it('loads the assets for each browser build', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'package.json': JSON.stringify(
            {
              ...JSON.parse(await fs.read('package.json')),
              browserslist: {
                ie11: ['ie 11'],
                defaults: ['extends @quilted/browserslist-config/defaults'],
              },
            },
            null,
            2,
          ),
        });

        const {url} = await buildAppAndRunServer(workspace);
        const defaultPage = await openPageAndWaitForNavigation(workspace, url);
        const ie11Page = await openPageAndWaitForNavigation(workspace, url, {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
        });

        expect(
          await defaultPage.$('script[src^="/assets/app.default"]'),
        ).not.toBeNull();
        expect(
          await ie11Page.$('script[src^="/assets/app.default"]'),
        ).toBeNull();

        expect(
          await defaultPage.$('script[src^="/assets/app.ie11"]'),
        ).toBeNull();
        expect(
          await ie11Page.$('script[src^="/assets/app.ie11"]'),
        ).not.toBeNull();
      });
    });

    it('creates a hashed URL pointing to a publicly-served version of the image', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            import image from '../../common/images/lemon.png';
            
            export default function App() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(await getLoadedImages(page)).toStrictEqual([
          expect.objectContaining({
            url: expect.stringMatching(/[/]assets[/]lemon\.[a-zA-Z0-9]*\.png/),
          }),
        ]);
      });
    });

    it('inlines small images into the JavaScript bundle', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            import image from '../../common/images/lemon-tiny.png';
            
            export default function App() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(await getLoadedImages(page)).toHaveLength(0);

        const imageSource = await page.evaluate(
          () => document.querySelector('img')?.src,
        );

        expect(imageSource).toMatch('data:image/png;base64,');
      });
    });

    it('lets the developer configure a custom size limit for image inlining', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'rollup.config.js': stripIndent`
            import {quiltApp} from '@quilted/rollup/app';

            export default quiltApp({
              assets: {
                inline: {limit: 0},
              },
            });
          `,
          'App.tsx': stripIndent`
            import image from '../../common/images/lemon-tiny.png';
              
            export default function App() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(await getLoadedImages(page)).toStrictEqual([
          expect.objectContaining({
            url: expect.stringMatching(
              /[/]assets[/]lemon-tiny\.[a-zA-Z0-9]*\.png/,
            ),
          }),
        ]);
      });
    });

    it('inlines raw file contents into the JavaScript bundle', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'message.txt': 'Hello, world!',
          'App.tsx': stripIndent`
            import message from './message.txt?raw';

            export default function App() {
              return <div>{message}</div>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(await page.textContent('body')).toBe('Hello, world!');
      });
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
