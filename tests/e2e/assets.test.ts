import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities';
import type {Page} from './utilities';

jest.setTimeout(20_000);

describe('app builds', () => {
  describe('assets', () => {
    it('creates a hashed URL pointing to a publicly-served version of the image', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import image from '../../../common/images/lemon.png';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
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
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import image from '../../../common/images/lemon-tiny.png';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
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
          'quilt.project.ts': stripIndent`
            import {createApp, quiltApp} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft';
            
            export default createApp((app) => {
              app.entry('./App');
              app.use(quiltApp({
                assets: {
                  inline: {limit: 0},
                },
              }));
              app.use(addInternalExportCondition());
            });
          `,
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import image from '../../../common/images/lemon-tiny.png';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
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

    it('lets the developer configure a custom output filename for static assets', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'quilt.project.ts': stripIndent`
            import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft';
            
            export default createApp((app) => {
              app.entry('./App');
              app.use(quiltApp());
              app.use(
                createProjectPlugin({
                  name: 'MyApp.CustomizeStaticAssetPattern',
                  build({configure}) {
                    configure(({quiltAssetStaticOutputFilenamePattern}) => {
                      quiltAssetStaticOutputFilenamePattern?.(
                        (pattern) => \`images/\${pattern}\`,
                      );
                    });
                  },
                }),
              )
              app.use(addInternalExportCondition());
            });
          `,
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import image from '../../../common/images/lemon.png';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
              return <img src={image} alt="A lemon." />;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace);

        expect(await getLoadedImages(page)).toStrictEqual([
          expect.objectContaining({
            url: expect.stringMatching(
              /[/]assets[/]images[/]lemon\.[a-zA-Z0-9]*\.png/,
            ),
          }),
        ]);
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
