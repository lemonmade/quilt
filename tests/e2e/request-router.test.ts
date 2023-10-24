import {describe, it, expect} from 'vitest';
import {fetch} from '@remix-run/web-fetch';

import {
  withWorkspace,
  stripIndent,
  startServer,
  getPort,
  waitForUrl,
} from './utilities.ts';

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

      expect(result).toMatchObject({url: url.href});
    });
  });

  it('can short-circuit by throwing a response as an error', async () => {
    await withWorkspace({fixture: 'basic-api'}, async (workspace) => {
      const {fs, command} = workspace;

      await fs.write({
        'api.ts': stripIndent`
          export default function handler(request) {
            throw new Response(JSON.stringify({url: request.url}), {
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
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

      expect(result).toMatchObject({url: url.href});
    });
  });

  it('can short-circuit by throwing a ResponseShortCircuit error', async () => {
    await withWorkspace({fixture: 'basic-api'}, async (workspace) => {
      const {fs, command} = workspace;

      await fs.write({
        'api.ts': stripIndent`
          import {ResponseShortCircuitError} from '@quilted/quilt/request-router';

          export default function handler(request) {
            throw new ResponseShortCircuitError(
              new Response(JSON.stringify({url: request.url}), {
                headers: {
                  'Content-Type': 'application/json',
                },
              }),
            );
          }
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

      expect(result).toMatchObject({url: url.href});
    });
  });

  it('can short-circuit with a redirect by throwing a ResponseRedirectError error', async () => {
    await withWorkspace({fixture: 'basic-api'}, async (workspace) => {
      const {fs, command} = workspace;

      await fs.write({
        'api.ts': stripIndent`
          import {ResponseRedirectError} from '@quilted/quilt/request-router';

          export default function handler(request) {
            throw new ResponseRedirectError('/redirect');
          }
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
      const response = await fetch(url, {redirect: 'manual'});

      expect(response).toHaveProperty('status', 308);
      expect(response.headers.get('Location')).toBe(
        new URL('/redirect', url).href,
      );
    });
  });
});
