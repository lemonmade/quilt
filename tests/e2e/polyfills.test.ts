import fetch from 'node-fetch';

import {
  withWorkspace,
  stripIndent,
  startServer,
  getPort,
  waitForUrl,
} from './utilities';

describe('http', () => {
  describe('cookies', () => {
    it('provides the request cookies during server rendering', async () => {
      await withWorkspace({fixture: 'basic-api'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'api.ts': stripIndent`
            import {createHttpHandler, json} from '@quilted/quilt/http-handlers';

            const handler = createHttpHandler();
            
            handler.get('/', async () => {
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

              return json(await result.json());
            });
            
            export default handler;          
          `,
          'quilt.project.ts': stripIndent`
            import {createService, quiltService, quiltWorkspace} from '@quilted/craft';
            import {addInternalExportCondition} from '../../common/craft';
            
            export default createService((app) => {
              app.entry('./api');
              app.use(
                quiltWorkspace(),
                quiltService({
                  polyfill: {features: ['fetch', 'abort-controller']},
                }),
                addInternalExportCondition(),
              );
            });
          `,
        });

        await command.quilt.build();

        const port = await getPort();
        const url = new URL(`http://localhost:${port}`);

        // Start the server
        startServer(() =>
          command.node(fs.resolve('build/runtime/index.js'), {
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
