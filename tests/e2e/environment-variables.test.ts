import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('app builds', () => {
  describe('environment variables', () => {
    it('inlines environment variables specified in the configuration file', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;
        const builder = 'Chris';

        await fs.write({
          'quilt.project.ts': stripIndent`
              import {createApp, quiltApp} from '@quilted/craft';
              import {addInternalExportCondition} from '../../common/craft';
              
              export default createApp((app) => {
                app.entry('./App');
                app.use(quiltApp({
                  env: {inline: ['BUILDER']},
                }));
                app.use(addInternalExportCondition());
              });
            `,
          'foundation/Routes.tsx': stripIndent`
              import Env from '@quilted/quilt/env';
              import {useRoutes} from '@quilted/quilt';
              
              export function Routes() {
                return useRoutes([{match: '/', render: () => <Start />}]);
              }
              
              function Start() {
                return <div>Hello, {Env.BUILDER}!</div>;
              }
            `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
          build: {
            env: {
              BUILDER: JSON.stringify(builder),
            },
          },
        });

        expect(await page.textContent('body')).toMatch(`Hello, ${builder}!`);
      });
    });

    it('automatically inlines a MODE environment variable', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import Env from '@quilted/quilt/env';
            import {useRoutes} from '@quilted/quilt';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
              return <div>{Env.MODE}</div>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
        });

        expect(await page.textContent('body')).toMatch(`production`);
      });
    });

    it('loads .env files for production builds', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          '.env':
            'FROM_ENV=1\nFROM_ENV_LOCAL=1\nFROM_ENV_MODE=1\nFROM_ENV_MODE_LOCAL=1',
          '.env.local':
            'FROM_ENV_LOCAL=2\nFROM_ENV_MODE=2\nFROM_ENV_MODE_LOCAL=2',
          '.env.production': 'FROM_ENV_MODE=3\nFROM_ENV_MODE_LOCAL=3',
          '.env.production.local': 'FROM_ENV_MODE_LOCAL=4',
          'quilt.project.ts': stripIndent`
            import {createApp, quiltApp} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft';
            
            export default createApp((app) => {
              app.entry('./App');
              app.use(quiltApp({
                env: {
                  inline: ['FROM_ENV', 'FROM_ENV_LOCAL', 'FROM_ENV_MODE', 'FROM_ENV_MODE_LOCAL'],
                },
              }));
              app.use(addInternalExportCondition());
            });
          `,
          'foundation/Routes.tsx': stripIndent`
            import Env from '@quilted/quilt/env';
            import {useRoutes} from '@quilted/quilt';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
              return <div>{Env.FROM_ENV}{Env.FROM_ENV_LOCAL}{Env.FROM_ENV_MODE}{Env.FROM_ENV_MODE_LOCAL}</div>;
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
        });

        expect(await page.textContent('body')).toMatch(`1234`);
      });
    });

    it('inlines environment variables into the app server', async () => {
      await withWorkspace(
        {fixture: 'basic-app', debug: true},
        async (workspace) => {
          const {fs} = workspace;
          const builder = 'Chris';

          await fs.write({
            '.env': `BUILDER=${builder}`,
            'quilt.project.ts': stripIndent`
              import {createApp, quiltApp} from '@quilted/craft';
              import {addInternalExportCondition} from '../../common/craft';
              
              export default createApp((app) => {
                app.entry('./App');
                app.use(quiltApp({
                  server: {
                    env: {inline: ['BUILDER']},
                  },
                }));
                app.use(addInternalExportCondition());
              });
            `,
            'foundation/Routes.tsx': stripIndent`
              import Env from '@quilted/quilt/env';
              import {useRoutes} from '@quilted/quilt';
              import {useSerialized} from '@quilted/quilt/html';
              
              export function Routes() {
                return useRoutes([{match: '/', render: () => <Start />}]);
              }
              
              function Start() {
                const builder = useSerialized('Builder', Env.BUILDER);
                return <div>Hello, {builder}!</div>;
              }
            `,
          });

          const {page} = await buildAppAndOpenPage(workspace, {
            path: '/',
          });

          expect(await page.textContent('body')).toMatch(`Hello, ${builder}!`);
        },
      );
    });
  });
});
