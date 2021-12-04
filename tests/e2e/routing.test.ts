import {
  buildAppAndOpenPage,
  waitForPerformanceNavigation,
  stripIndent,
  withWorkspace,
} from './utilities';
import type {Page} from './utilities';

jest.setTimeout(process.env.CI ? 30_000 : 10_000);

describe('routing', () => {
  describe('scroll restoration', () => {
    it('scrolls to the top when navigating to a new page, and back to its original position when navigating back', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        const scrollBy = 100;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {
              Link,
              useRoutes,
              usePerformanceNavigation,
            } from '@quilted/quilt';

            export function Routes() {
              return useRoutes([
                {match: 'one', render: () => <PageOne />},
                {match: 'two', render: () => <PageTwo />},
              ]);
            }

            function PageOne() {
              usePerformanceNavigation();

              return (
                <ScrollSpacer>
                  <Link to="/two">To page two</Link>
                </ScrollSpacer>
              );
            }

            function PageTwo() {
              usePerformanceNavigation();

              return (
                <ScrollSpacer>
                  <Link to="/one">To page one</Link>
                </ScrollSpacer>
              );
            }

            function ScrollSpacer({children}) {
              return (
                <>
                  <div style={{height: '${scrollBy}px'}} />
                  {children}
                  <div style={{height: '200vh'}} />
                </>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/one',
          // Make sure we can scroll at least our scroll amount, with
          // plenty of wiggle room :D
          viewport: {height: scrollBy * 4, width: 500},
        });

        await scrollTo(page, scrollBy);

        await waitForPerformanceNavigation(page, {
          to: '/two',
          async action() {
            await page.click('a');
          },
        });

        expect(await getScrollTop(page)).toBe(0);

        await waitForPerformanceNavigation(page, {
          to: '/one',
          async action() {
            await goBack(page);
          },
        });

        expect(await getScrollTop(page)).toBe(scrollBy);
      });
    });
  });

  describe('navigation blocking', () => {
    it('blocks until a synchronous blocking function calls to allow the navigation to proceed', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {useState} from 'react';
            import {
              Link,
              useRoutes,
              useNavigationBlock,
              usePerformanceNavigation,
            } from '@quilted/quilt';

            export function Routes() {
              return useRoutes([
                {match: 'one', render: () => <PageOne />},
                {match: 'two', render: () => <PageTwo />},
              ]);
            }

            function PageOne() {
              usePerformanceNavigation();

              const [allow, setAllow] = useState();

              useNavigationBlock(({allow}) => {
                setAllow(() => allow);
                return true;
              });

              return (
                <>
                  <Link to="/two">To page two</Link>
                  {allow && <button type="button" onClick={allow}>Proceed?</button>}
                </>
              );
            }

            function PageTwo() {
              usePerformanceNavigation();

              return (
                <Link to="/one">To page one</Link>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/one',
        });

        await page.click('a');
        await page.waitForSelector('button', {timeout: 200});

        await waitForPerformanceNavigation(page, {
          to: '/two',
          async action() {
            await page.click('button');
          },
        });

        expect(new URL(page.url()).pathname).toBe('/two');
      });
    });

    it('blocks until an asynchronous blocking function resolves', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {
              Link,
              useRoutes,
              useNavigationBlock,
              usePerformanceNavigation,
            } from '@quilted/quilt';
            import {waiter} from 'e2e/globals';

            export function Routes() {
              return useRoutes([
                {match: 'one', render: () => <PageOne />},
                {match: 'two', render: () => <PageTwo />},
              ]);
            }

            function PageOne() {
              usePerformanceNavigation();

              useNavigationBlock(async () => {
                await waiter.wait('blocking');
              });

              return (
                <Link to="/two">To page two</Link>
              );
            }

            function PageTwo() {
              usePerformanceNavigation();

              return (
                <Link to="/one">To page one</Link>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/one',
        });

        await page.click('a');

        expect(new URL(page.url()).pathname).toBe('/one');

        await waitForPerformanceNavigation(page, {
          to: '/two',
          async action() {
            await page.evaluate(() => {
              window.Quilt!.E2E!.Waiter!.done('blocking');
            });
          },
        });

        expect(new URL(page.url()).pathname).toBe('/two');
      });
    });

    it('blocks back navigation in the browser until a blocker resolves', async () => {
      await withWorkspace({fixture: 'basic-app'}, async (workspace) => {
        const {fs} = workspace;

        await fs.write({
          'foundation/Routes.tsx': stripIndent`
            import {
              Link,
              useRoutes,
              useNavigationBlock,
              usePerformanceNavigation,
            } from '@quilted/quilt';
            import {waiter} from 'e2e/globals';

            export function Routes() {
              return useRoutes([
                {match: 'one', render: () => <PageOne />},
                {match: 'two', render: () => <PageTwo />},
              ]);
            }

            function PageOne() {
              usePerformanceNavigation();

              return (
                <Link to="/two">To page two</Link>
              );
            }

            function PageTwo() {
              usePerformanceNavigation();

              useNavigationBlock(async () => {
                await waiter.wait('blocking');
              });

              return (
                <Link to="/one">To page one</Link>
              );
            }
          `,
        });

        const {page} = await buildAppAndOpenPage(workspace, {
          path: '/one',
        });

        await waitForPerformanceNavigation(page, {
          to: '/two',
          async action() {
            await page.click('a');
          },
        });

        await goBack(page);

        expect(new URL(page.url()).pathname).toBe('/two');

        await waitForPerformanceNavigation(page, {
          to: '/one',
          async action() {
            await page.evaluate(() => {
              window.Quilt!.E2E!.Waiter!.done('blocking');
            });
          },
        });

        expect(new URL(page.url()).pathname).toBe('/one');
      });
    });
  });
});

async function getScrollTop(page: Page) {
  const scroll = await page.evaluate(() => document.documentElement.scrollTop);
  return scroll;
}

async function scrollTo(page: Page, scrollTo: number) {
  await page.evaluate(async (scrollTo) => {
    document.documentElement.scrollTop = scrollTo;

    await new Promise<void>((resolve) => {
      document.documentElement.offsetHeight;

      const interval = setInterval(() => {
        if (document.documentElement.scrollTop === scrollTo) {
          clearInterval(interval);
          resolve();
        }
      }, 10);
    });
  }, scrollTo);
}

async function goBack(page: Page) {
  await page.goBack();
  // Some router logic happens in a popstate callback, and adding this extra bit of wait
  // time was the only way I found to make sure that logic has a chance to execute.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await page.evaluate(async () => {});
}
