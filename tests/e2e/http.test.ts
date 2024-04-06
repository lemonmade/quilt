import {describe, it, expect} from 'vitest';
import {multiline, createWorkspace, startServer} from './utilities.ts';

describe('http', () => {
  describe('cookies', () => {
    it('provides the request cookies during server rendering', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const cookieName = 'user';
      const cookieValue = 'Chris';

      await workspace.fs.write({
        'App.tsx': multiline`
          import {useCookie, HTML} from '@quilted/quilt/html';

          export default function App() {
            return (
              <HTML>
                <CookieUi />
              </HTML>
            )
          }
          
          function CookieUi() {
            const user = useCookie(${JSON.stringify(cookieName)});

            return (
              <div>{user ? \`Hello, \${user}!\` : 'Hello, mystery user!'}</div>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        javaScriptEnabled: false,
        async customizeContext(context, {url}) {
          await context.addCookies([
            {
              name: 'user',
              value: cookieValue,
              url: new URL('/', url).href,
            },
          ]);
        },
      });

      expect(await page.textContent('body')).toMatch(`Hello, ${cookieValue}`);
    });

    it('can set client-side cookies', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      const cookieName = 'user';
      const cookieValue = 'Chris';

      await workspace.fs.write({
        'App.tsx': multiline`
          import {HTML, useCookie, useCookies} from '@quilted/quilt/html';

          export default function App() {
            return (
              <HTML>
                <CookieUi />
              </HTML>
            )
          }

          function CookieUi() {
            const cookies = useCookies();
            const user = useCookie(${JSON.stringify(cookieName)});

            return (
              <>
                <div>{user ? \`Hello, \${user}!\` : 'Hello, mystery user!'}</div>
                <button onClick={() => {
                  cookies.set(${JSON.stringify(cookieName)}, ${JSON.stringify(
                    cookieValue,
                  )});
                }}>
                  Set user cookie
                </button>
              </>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      expect(await page.textContent('body')).not.toMatch(
        `Hello, ${cookieValue}`,
      );

      await page.click('button');

      expect(await page.textContent('body')).toMatch(`Hello, ${cookieValue}`);

      await page.reload();

      expect(await page.textContent('body')).toMatch(`Hello, ${cookieValue}`);
    });

    it('can set response cookies from the node server', async () => {
      await using workspace = await createWorkspace({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {ResponseCookie} from '@quilted/quilt/http';
          
          export default function App() {
            return (
              <>
                <ResponseCookie
                  name="one"
                  value="one"
                />
                <ResponseCookie
                  name="two"
                  value="two"
                />
              </>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      const cookies = await page.context().cookies();

      expect(cookies).toStrictEqual([
        expect.objectContaining({
          name: 'one',
          value: 'one',
        }),
        expect.objectContaining({
          name: 'two',
          value: 'two',
        }),
      ]);
    });
  });
});
