import {describe, it, expect} from 'vitest';
import {fetch} from '@remix-run/web-fetch';

import {
  withWorkspace,
  stripIndent,
  startServer,
  getPort,
  waitForUrl,
} from './utilities.ts';

describe('polyfills', () => {
  describe('services', () => {
    it('can polyfill node for services', async () => {
      await withWorkspace({fixture: 'basic-api'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'api.ts': stripIndent`
            import {RequestRouter, JSONResponse} from '@quilted/quilt/request-router';

            const router = new RequestRouter();
            
            router.get('/', async () => {
              const result = await fetch('https://swapi-graphql.netlify.app/.netlify/functions/index', {
                method: 'POST',
                signal: new AbortController().signal,
                body: JSON.stringify({
                  query: '{ __schema { types { name } } }',
                }),
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              return new JSONResponse(await result.json());
            });
            
            export default router;          
          `,
          'quilt.project.ts': stripIndent`
            import {createProject, quiltService, quiltWorkspace} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft.ts';
            
            export default createProject((project) => {
              project.use(
                quiltWorkspace(),
                quiltService({
                  entry: './api.ts',
                  polyfill: {features: ['fetch', 'abort-controller']},
                }),
                addInternalExportCondition(),
              );
            });
          `,
        });

        await command.pnpm('build');

        const port = await getPort();
        const url = new URL(`http://localhost:${port}`);

        // Start the server
        startServer(() =>
          command.node(fs.resolve('build/runtime/runtime.js'), {
            env: {PORT: String(port)},
          }),
        );

        await waitForUrl(url);
        const result = await (await fetch(url)).json();

        expect(result).toMatchObject({data: {__schema: expect.any(Object)}});
      });
    });
  });
});
