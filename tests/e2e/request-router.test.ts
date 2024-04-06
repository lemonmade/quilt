import {describe, it, expect} from 'vitest';

import {multiline, startServer, createWorkspace} from './utilities.ts';

describe('request-router', () => {
  it('can generate a server from a request handler', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-api'});

    await workspace.fs.write({
      'api.ts': multiline`
        export default function handler(request) {
          return new Response(JSON.stringify({url: request.url}), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      `,
    });

    const server = await startServer(workspace, {
      path: 'build/output/api.js',
    });

    const response = await server.fetch('/');
    const result = await response.json();

    expect(result).toMatchObject({url: server.url.href});
  });

  it('can short-circuit by throwing a response as an error', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-api'});

    await workspace.fs.write({
      'api.ts': multiline`
        export default function handler(request) {
          throw new Response(JSON.stringify({url: request.url}), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      `,
    });

    const server = await startServer(workspace, {
      path: 'build/output/api.js',
    });

    const response = await server.fetch('/');
    const result = await response.json();

    expect(result).toMatchObject({url: server.url.href});
  });

  it('can short-circuit by throwing a ResponseShortCircuit error', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-api'});

    await workspace.fs.write({
      'api.ts': multiline`
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

    const server = await startServer(workspace, {
      path: 'build/output/api.js',
    });

    const response = await server.fetch('/');
    const result = await response.json();

    expect(result).toMatchObject({url: server.url.href});
  });

  it('can short-circuit with a redirect by throwing a ResponseRedirectError error', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-api'});

    await workspace.fs.write({
      'api.ts': multiline`
        import {ResponseRedirectError} from '@quilted/quilt/request-router';

        export default function handler(request) {
          throw new ResponseRedirectError('/redirect', {request});
        }
      `,
    });

    const server = await startServer(workspace, {
      path: 'build/output/api.js',
    });

    const response = await server.fetch('/', {redirect: 'manual'});
    expect(response).toHaveProperty('status', 308);
    expect(response.headers.get('Location')).toBe(
      new URL('/redirect', server.url).href,
    );
  });

  it('can have an alternative "runtime" environment that handles requests', async () => {
    await using workspace = await createWorkspace({fixture: 'basic-api'});

    await workspace.fs.write({
      'rollup.config.js': multiline`
        import {quiltServer} from '@quilted/rollup/server';

        export default quiltServer({
          runtime: {
            requestRouter() {
              return [
                'import router from "quilt:module/request-router";',
                'import {handleRequest} from "@quilted/quilt/request-router";',
                'const fetch = (request) => handleRequest(router, request);',
                'export default {fetch};',
              ].join('\\n');
            },
          },
        });
      `,
      'api.ts': multiline`
        export default function handler(request) {
          return new Response('Hello world!');
        }
      `,
    });

    await workspace.command.pnpm('build');

    const {default: server} = (await import(
      workspace.fs.resolve('build/output/api.js')
    )) as {default: {fetch(request: Request): Promise<Response>}};

    const response = await server.fetch(new Request('https://example.com'));
    expect(await response.text()).toBe('Hello world!');
  });
});
