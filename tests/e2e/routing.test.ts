import {
  buildAppAndOpenPage,
  waitForPerformanceNavigation,
  stripIndent,
  withWorkspace,
} from './utilities';
import type {Page} from './utilities';

jest.setTimeout(20_000);

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
            await page.goBack();
          },
        });

        expect(await getScrollTop(page)).toBe(scrollBy);
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
