import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from '../utilities.ts';

const HTMX_BROWSER_ENTRY = multiline`
  import htmx from 'htmx.org';

  Object.assign(window, {htmx});

  htmx.process(document.body);
`;

describe('htmx', () => {
  it('can render an htmx server and client', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'browser.tsx': HTMX_BROWSER_ENTRY,
      'server.tsx': multiline`
        import '@quilted/quilt/globals';
        import {RequestRouter, HTMLResponse} from '@quilted/quilt/request-router';
        import {renderToResponse} from '@quilted/quilt/server';
        import {BrowserAssets} from 'quilt:module/assets';
        
        const router = new RequestRouter();
        const assets = new BrowserAssets();
        
        router.get('/', async (request) => {
          const response = await renderToResponse(<App />, {
            request,
            assets,
          });
        
          return response;
        });
        
        function App() {
          return (
            <div>
              <p>My app</p>
              <button hx-post="/clicked" hx-swap="outerHTML">
                Click me!
              </button>
            </div>
          );
        }

        router.post('/clicked', async (request) => {
          const response = await renderToResponse(<ClickedButton />, {
            request,
            renderHTML: 'fragment',
          });
          return response;
        });
        
        function ClickedButton() {
          return <button data-clicked>Clicked!</button>;
        }
        
        export default router;
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    await page.click('button');
    await page.waitForSelector('[data-clicked]');

    expect(await page.textContent('button')).toBe('Clicked!');
  });

  it('provides helpful utilities for dealing with HTMX requests and responses', async () => {
    await using workspace = await createWorkspace({fixture: 'empty-app'});

    await workspace.fs.write({
      'browser.tsx': HTMX_BROWSER_ENTRY,
      'server.tsx': multiline`
        import '@quilted/quilt/globals';
        import {parseHTMXRequestHeaders, HTMXResponse} from '@quilted/htmx';
        import {RequestRouter} from '@quilted/quilt/request-router';
        import {renderToResponse} from '@quilted/quilt/server';
        import {BrowserAssets} from 'quilt:module/assets';
        
        const router = new RequestRouter();
        const assets = new BrowserAssets();
        
        router.get('/', async (request) => {
          const response = await renderToResponse(<App />, {
            request,
            assets,
          });
        
          return response;
        });
        
        function App() {
          return (
            <>
              <button id="one" hx-post="/choose">
                Option one
              </button>
              <button id="two" hx-post="/choose">
                Option two
              </button>
            </>
          );
        }
        
        router.post('/choose', async (request) => {
          const {trigger} = parseHTMXRequestHeaders(request.headers);

          const {body} = await renderToResponse(<Confirmation selection={trigger} />, {
            request,
            renderHTML: 'fragment',
          });
        
          return new HTMXResponse(body, {
            htmx: {
              target: 'body',
            },
          });
        });
        
        function Confirmation({selection}: {selection?: string}) {
          if (selection == null) {
            return <div data-confirmation>You didn’t choose an option!</div>;
          }
        
          return <div data-confirmation>You chose option: {selection}</div>;
        }
        
        export default router;
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage();

    await page.click('button#two');

    await page.waitForSelector('[data-confirmation]');

    expect(await page.textContent('body')).toBe('You chose option: two');
  });
});
