import {jest, describe, it, expect} from '@quilted/testing';
import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities.ts';

jest.setTimeout(20_000);

describe('app builds', () => {
  describe('entry', () => {
    it('uses the `main` field from package.json', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'package.json': JSON.stringify(
            {
              ...JSON.parse(await fs.read('package.json')),
              main: 'MyApp.tsx',
            },
            null,
            2,
          ),
          'MyApp.tsx': stripIndent`
            export default function App() {
              return <>Hello world</>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(
          await page.evaluate(() => document.documentElement.textContent),
        ).toBe('Hello world');
      });
    });

    it('prefers an explicit entry over one from package.json', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'package.json': JSON.stringify(
            {
              ...JSON.parse(await fs.read('package.json')),
              main: 'App.tsx',
            },
            null,
            2,
          ),
          'quilt.project.ts': stripIndent`
            import {createProject, quiltApp, quiltWorkspace} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft.ts';
            
            export default createProject((project) => {
              project.use(
                quiltWorkspace(),
                quiltApp({
                  entry: './MyApp.tsx',
                }),
                addInternalExportCondition(),
              );
            });
          `,
          'MyApp.tsx': stripIndent`
            export default function App() {
              return <>Hello world</>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(
          await page.evaluate(() => document.documentElement.textContent),
        ).toBe('Hello world');
      });
    });

    it('uses an App.tsx file when there is no dedicated entry file', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'App.tsx': stripIndent`
            export default function App() {
              return <>Hello world</>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(
          await page.evaluate(() => document.documentElement.textContent),
        ).toBe('Hello world');
      });
    });

    it('uses an app.tsx file when there is no dedicated entry file', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.remove('App.tsx');
        await fs.write({
          'app.tsx': stripIndent`
            export default function App() {
              return <>Hello world</>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(
          await page.evaluate(() => document.documentElement.textContent),
        ).toBe('Hello world');
      });
    });

    it('uses an index.tsx file when there is no dedicated entry file', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.remove('App.tsx');
        await fs.write({
          'index.tsx': stripIndent`
            export default function App() {
              return <>Hello world</>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(
          await page.evaluate(() => document.documentElement.textContent),
        ).toBe('Hello world');
      });
    });

    it('supports apps that have completely custom browser entries', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.remove('App.tsx');
        await fs.write({
          'browser.ts': stripIndent`
            const element = document.createElement('main');
            element.textContent = 'Hello world';

            document.body.append(element);
          `,
          'server.ts': stripIndent`
            import {createRequestRouter, createServerRender} from '@quilted/quilt/server';
            import {createBrowserAssets} from '@quilted/quilt/magic/assets';
                      
            const router = createRequestRouter();

            router.get(
              createServerRender({
                assets: createBrowserAssets(),
                html: {
                  rootElement: false,
                },
              }),
            );
            
            export default router;
          `,
          'quilt.project.ts': (await fs.read('quilt.project.ts')).replace(
            `quiltApp()`,
            stripIndent`
              quiltApp({
                browser: {entry: "./browser.ts"},
                server: {entry: "./server.ts"},
              })
            `,
          ),
        });

        const {page} = await buildAppAndOpenPage(workspace);

        await page.waitForSelector('main');

        expect(await page.evaluate(() => document.body.innerHTML)).toBe(
          '<main>Hello world</main>',
        );
      });
    });
  });
});
