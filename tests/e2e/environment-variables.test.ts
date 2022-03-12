import {buildAppAndOpenPage, stripIndent, withWorkspace} from './utilities';

jest.setTimeout(20_000);

describe('app builds', () => {
  describe('environment variables', () => {
    it('inlines environment variables specified in the configuration file', async () => {
      await withWorkspace(
        {fixture: 'basic-app', debug: true},
        async (workspace) => {
          const {fs} = workspace;
          const builder = 'Chris';

          await fs.write({
            'sewing-kit.config.ts': stripIndent`
              import {createApp, quiltApp} from '@quilted/craft';
              import {addInternalExportCondition} from '../../common/sewing-kit';
              
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
              import {useRoutes, useCookie} from '@quilted/quilt';
              
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
        },
      );
    });
  });
});
