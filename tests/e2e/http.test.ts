import {
  buildAppAndOpenPage,
  stripIndent,
  waitForPerformanceNavigation,
  withWorkspace,
} from './utilities';

jest.setTimeout(20_000);

describe('http', () => {
  describe('cookies', () => {
    it('provides the request cookies during server rendering', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        const cookieName = 'user';
        const cookieValue = 'Chris';

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
              import {useRoutes, useCookie} from '@quilted/quilt';
              
              export function Routes() {
                return useRoutes([{match: '/', render: () => <Start />}]);
              }
              
              function Start() {
                const user = useCookie(${JSON.stringify(cookieName)});

                return (
                  <>
                    <div>{user ? \`Hello, \${user}!\` : 'Hello, mystery user!'}</div>
                  </>
                );
              }
            `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
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
    });

    it('can set client-side cookies', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        const cookieName = 'user';
        const cookieValue = 'Chris';

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes, useCookie, useCookies} from '@quilted/quilt';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
              const cookies = useCookies();
              const user = useCookie(${JSON.stringify(cookieName)});

              return (
                <>
                  <div>{user ? \`Hello, \${user}!\` : 'Hello, mystery user!'}</div>
                  <button onClick={() => cookies.set(${JSON.stringify(
                    cookieName,
                  )}, ${JSON.stringify(cookieValue)})}>
                    Set user cookie
                  </button>
                </>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
        });

        expect(await page.textContent('body')).not.toMatch(
          `Hello, ${cookieValue}`,
        );

        await page.click('button');
        await page.reload();
        await waitForPerformanceNavigation(page, {
          to: '/',
          checkCompleteNavigations: true,
        });

        expect(await page.textContent('body')).toMatch(`Hello, ${cookieValue}`);
      });
    });

    it('can set response cookies from the node server', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useRoutes} from '@quilted/quilt';
            import {ResponseCookie} from '@quilted/quilt/http';
            
            export function Routes() {
              return useRoutes([{match: '/', render: () => <Start />}]);
            }
            
            function Start() {
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

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/',
        });

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
});
