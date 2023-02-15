import {jest, describe, it, expect} from '@quilted/testing';
import {fetch} from '@remix-run/web-fetch';

import {
  withWorkspace,
  stripIndent,
  startServer,
  getPort,
  waitForUrl,
} from './utilities';

jest.setTimeout(20_000);

describe('request-router', () => {
  it('can generate a service from a request handler', async () => {
    await withWorkspace({fixture: 'basic-api'}, async (workspace) => {
      const {fs, command} = workspace;

      await fs.write({
        'api.ts': stripIndent`
          export default function handler(request) {
            return new Response(JSON.stringify({url: request.url}), {
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }        
        `,
      });

      await command.quilt.build();

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

      expect(result).toMatchObject({url: url.href});
    });
  });
});
