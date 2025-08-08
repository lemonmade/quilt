import {describe, it, expect} from 'vitest';
import {multiline, Workspace, startServer} from './utilities.ts';

describe('browser', () => {
  describe('cookies', () => {
    it('provides the request cookies during server rendering', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      const cookieName = 'user';
      const cookieValue = 'Chris';

      await workspace.fs.write({
        'App.tsx': multiline`
          import {useCookie} from '@quilted/quilt/browser';

          export default function App() {
            return <CookieUI />;
          }
          
          function CookieUI() {
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
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      const cookieName = 'user';
      const cookieValue = 'Chris';

      await workspace.fs.write({
        'App.tsx': multiline`
          import {useCookie, useCookies} from '@quilted/quilt/browser';

          export default function App() {
            return <CookieUI />;
          }

          function CookieUI() {
            const cookies = useCookies();
            const user = cookies.get(${JSON.stringify(cookieName)});

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

    it('can set response cookies from a node server', async () => {
      await using workspace = await Workspace.create({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {ResponseCookie} from '@quilted/quilt/server';
          
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

  describe('meta', () => {
    it('only renders one meta tag with a given content attribute', async () => {
      await using workspace = await Workspace.create({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {Meta} from '@quilted/quilt/browser';

          export default function App() {
            return (
              <>
                <Meta name="description" content="First description" />
                <Meta name="description" content="Second description" />
                <Meta name="keywords" content="test, meta, tags" />
              </>
            );
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage();

      const metaTags = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('meta')).map((tag) => ({
          name: tag.getAttribute('name'),
          content: tag.getAttribute('content'),
        }));
      });

      expect(metaTags).toStrictEqual([
        {name: 'description', content: 'Second description'},
        {name: 'keywords', content: 'test, meta, tags'},
      ]);
    });
  });

  describe.skip('head scripts', () => {
    it('includes the referenced scripts in the head', async () => {
      await using workspace = await Workspace.create({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {HeadScript} from '@quilted/quilt/browser';

          export default function App() {
            return <HeadScript src="/script.js" />;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        javaScriptEnabled: false,
      });

      expect(await page.innerHTML('head')).toMatch(`<script src="/script.js">`);
    });
  });

  describe.skip('head styles', () => {
    it('includes the referenced styles in the head', async () => {
      await using workspace = await Workspace.create({fixture: 'empty-app'});

      await workspace.fs.write({
        'App.tsx': multiline`
          import {HeadStyle} from '@quilted/quilt/browser';

          export default function App() {
            return <HeadStyle href="/style.css" />;
          }
        `,
      });

      const server = await startServer(workspace);
      const page = await server.openPage('/', {
        javaScriptEnabled: false,
      });

      expect(await page.innerHTML('head')).toMatch(
        `<link rel="stylesheet" href="/style.css">`,
      );
    });
  });
});
