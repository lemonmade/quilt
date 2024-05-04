import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('app builds', () => {
  describe('environment variables', () => {
    it('inlines environment variables specified in the configuration file', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const builder = 'Chris';

      await workspace.fs.write({
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';

          export default quiltApp({
            env: {inline: ['BUILDER']},
          });
        `,
        'App.tsx': multiline`
          import Env from 'quilt:module/env';

          export default function App() {
            return <div>Hello, {Env.BUILDER}!</div>;
          }
        `,
      });

      const server = await startServer(workspace, {
        build: {
          env: {
            BUILDER: JSON.stringify(builder),
          },
        },
      });

      const page = await server.openPage();

      expect(await page.textContent('body')).toMatch(`Hello, ${builder}!`);
    });

    it('automatically inlines a MODE environment variable', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import Env from 'quilt:module/env';
          
          export default function App() {
            return <div>{Env.MODE}</div>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).toMatch(`production`);
    });

    it('automatically replaces process.env.NODE_ENV with the MODE environment variable', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          export default function App() {
            const nodeEnv = process.env.NODE_ENV;
            return <div>NODE_ENV: {nodeEnv}</div>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).toMatch(`NODE_ENV: production`);
    });

    it('automatically replaces globalThis.process.env.NODE_ENV with the MODE environment variable', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
            export default function App() {
              const nodeEnv = globalThis.process.env.NODE_ENV;
              return <div>NODE_ENV: {nodeEnv}</div>;
            }
          `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).toMatch(`NODE_ENV: production`);
    });

    it('loads .env files for production builds', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        '.env':
          'FROM_ENV=1\nFROM_ENV_LOCAL=1\nFROM_ENV_MODE=1\nFROM_ENV_MODE_LOCAL=1',
        '.env.local':
          'FROM_ENV_LOCAL=2\nFROM_ENV_MODE=2\nFROM_ENV_MODE_LOCAL=2',
        '.env.production': 'FROM_ENV_MODE=3\nFROM_ENV_MODE_LOCAL=3',
        '.env.production.local': 'FROM_ENV_MODE_LOCAL=4',
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';

          export default quiltApp({
            env: {
              inline: ['FROM_ENV', 'FROM_ENV_LOCAL', 'FROM_ENV_MODE', 'FROM_ENV_MODE_LOCAL'],
            },
          });
        `,
        'App.tsx': multiline`
          import Env from 'quilt:module/env';
          
          export default function App() {
            return <div>{Env.FROM_ENV}{Env.FROM_ENV_LOCAL}{Env.FROM_ENV_MODE}{Env.FROM_ENV_MODE_LOCAL}</div>;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).toMatch(`1234`);
    });

    it('inlines environment variables into the app server', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const builder = 'Chris';

      await workspace.fs.write({
        '.env': `BUILDER=${builder}`,
        'rollup.config.js': multiline`
          import {quiltApp} from '@quilted/rollup/app';

          export default quiltApp({
            server: {
              env: {inline: ['BUILDER']},
            },
          });
        `,
        'App.tsx': multiline`
          import {useSerialized} from '@quilted/quilt/browser';
          import {Serialize} from '@quilted/quilt/server';
          import Env from 'quilt:module/env';
            
            export default function App() {
              const builder = useSerialized('Builder');

              return (
                <>
                  <div>Hello, {builder}!</div>
                  <Serialize id="Builder" data={Env.BUILDER} />
                </>
              );
            }
          `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).toMatch(`Hello, ${builder}!`);
    });
  });
});
