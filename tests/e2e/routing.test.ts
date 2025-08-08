import {describe, it, expect} from 'vitest';
import {type Page, multiline, Workspace, startServer} from './utilities.ts';

describe('routing', () => {
  it('can redirect between routes', async () => {
    await using workspace = await Workspace.create({fixture: 'basic-app'});

    await workspace.fs.write({
      'App.tsx': multiline`
        import {Navigation} from '@quilted/quilt/navigation';

        const routes = [
          {
            match: '/',
            redirect: '/redirected',
          },
          {
            match: '/redirected',
            render: 'Redirected',
          },
        ];
        
        export default function App() {
          return <Navigation routes={routes} />;
        }
      `,
    });

    const server = await startServer(workspace);
    const page = await server.openPage('/', {
      javaScriptEnabled: false,
    });

    const content = await page.textContent('body');
    expect(content).toBe(`Redirected`);

    expect(page.url()).toBe(new URL('/redirected', server.url).href);
  });

  describe.skip('scroll restoration', () => {
    it('scrolls to the top when navigating to a new page, and back to its original position when navigating back', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      const scrollBy = 100;

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one', {
        // Make sure we can scroll at least our scroll amount, with
        // plenty of wiggle room :D
        viewport: {height: scrollBy * 4, width: 500},
      });

      await scrollTo(page, scrollBy);

      await page.click('a');
      await page.waitForURL('/two');

      expect(await getScrollTop(page)).toBe(0);

      await goBack(page);
      await page.waitForURL('/one');

      expect(await getScrollTop(page)).toBe(scrollBy);
    });

    it('preserves the scroll position through a full browser reload with the default scroll restoration store', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      const scrollBy = 100;

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one', {
        // Make sure we can scroll at least our scroll amount, with
        // plenty of wiggle room :D
        viewport: {height: scrollBy * 4, width: 500},
      });

      await scrollTo(page, scrollBy);

      await page.click('a');
      await page.waitForURL('/two');

      await page.reload();
      await page.waitForURL('/two');

      await goBack(page);
      await page.waitForURL('/one');

      expect(await getScrollTop(page)).toBe(scrollBy);
    });

    it('allows customizing the “root” scroll view that is restored on navigation', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      const scrollBy = 100;
      const frameId = 'Frame';

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {
            Link,
            useRoutes,
            usePerformanceNavigation,
            useRouteChangeScrollRestoration,
          } from '@quilted/quilt';

          export function Routes() {
            const routes = useRoutes([
              {match: 'one', render: () => <PageOne />},
              {match: 'two', render: () => <PageTwo />},
            ]);

            return <Frame>{routes}</Frame>;
          }

          function Frame({children}) {
            const ref = useRouteChangeScrollRestoration();

            return (
              <div id=${JSON.stringify(
                frameId,
              )} ref={ref} style={{height: ${JSON.stringify(
                `${scrollBy}px`,
              )}, overflow: 'scroll'}}>
                {children}
              </div>
            )
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one', {
        // Make sure we can scroll at least our scroll amount, with
        // plenty of wiggle room :D
        viewport: {height: scrollBy * 4, width: 500},
      });

      await scrollTo(page, scrollBy, {selector: `#${frameId}`});

      await page.click('a');
      await page.waitForURL('/two');

      expect(await getScrollTop(page, {selector: `#${frameId}`})).toBe(0);

      await goBack(page);
      await page.waitForURL('/one');

      expect(await getScrollTop(page, {selector: `#${frameId}`})).toBe(
        scrollBy,
      );
    });

    it('can create additional named scroll areas that are also restored on navigation', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      const scrollBy = 100;
      const scrollAreaId = 'ScrollView';

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {
            Link,
            useRoutes,
            usePerformanceNavigation,
            useRouteChangeScrollRestoration,
          } from '@quilted/quilt';

          export function Routes() {
            return useRoutes([
              {match: 'one', render: () => <PageOne />},
              {match: 'two', render: () => <PageTwo />},
            ]);
          }

          function PageOne() {
            usePerformanceNavigation();
            const ref = useRouteChangeScrollRestoration(${JSON.stringify(
              scrollAreaId,
            )});

            console.log('MOUNTING AGAIN');

            return (
              <div id=${JSON.stringify(
                scrollAreaId,
              )} ref={(result) => {console.log({settingRef: true, ref: result?.outerHTML}); ref.current = result;}} style={{height: ${JSON.stringify(
                `${scrollBy}px`,
              )}, overflow: 'scroll'}}>
                <ScrollSpacer><Link to="/two">To page two</Link></ScrollSpacer>
              </div>
            );
          }

          function PageTwo() {
            usePerformanceNavigation();

            return null;
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one', {
        // Make sure we can scroll at least our scroll amount, with
        // plenty of wiggle room :D
        viewport: {height: scrollBy * 4, width: 500},
      });

      await scrollTo(page, scrollBy, {selector: `#${scrollAreaId}`});

      await page.click('a');
      await page.waitForURL('/two');

      await goBack(page);
      await page.waitForURL('/one');

      expect(await getScrollTop(page, {selector: `#${scrollAreaId}`})).toBe(
        scrollBy,
      );
    });
  });

  describe.skip('navigation blocking', () => {
    it('blocks until a synchronous blocking function calls to allow the navigation to proceed', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
          import {useState} from 'preact/hooks';
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one');

      await page.click('a');
      await page.waitForSelector('button', {timeout: 200});

      await page.click('button');
      await page.waitForURL('/two');

      expect(new URL(page.url()).pathname).toBe('/two');
    });

    // it('blocks until an asynchronous blocking function resolves', async () => {
    //   await using workspace = await Workspace.create({fixture: 'basic-app'});

    //   await workspace.fs.write({
    //     'foundation/Routes.tsx': multiline`
    //       import {
    //         Link,
    //         useRoutes,
    //         useNavigationBlock,
    //         usePerformanceNavigation,
    //       } from '@quilted/quilt';
    //       import {waiter} from 'e2e/globals';

    //       export function Routes() {
    //         return useRoutes([
    //           {match: 'one', render: () => <PageOne />},
    //           {match: 'two', render: () => <PageTwo />},
    //         ]);
    //       }

    //       function PageOne() {
    //         usePerformanceNavigation();

    //         useNavigationBlock(async () => {
    //           await waiter.wait('blocking');
    //         });

    //         return (
    //           <Link to="/two">To page two</Link>
    //         );
    //       }

    //       function PageTwo() {
    //         usePerformanceNavigation();

    //         return (
    //           <Link to="/one">To page one</Link>
    //         );
    //       }
    //     `,
    //   });

    //   const {page} = await buildAppAndOpenPage(workspace, {
    //     path: '/one',
    //   });

    //   await page.click('a');

    //   expect(new URL(page.url()).pathname).toBe('/one');

    //   await waitForPerformanceNavigation(page, {
    //     to: '/two',
    //     async action() {
    //       await page.evaluate(() => {
    //         window.Quilt!.E2E!.Waiter!.done('blocking');
    //       });
    //     },
    //   });

    //   expect(new URL(page.url()).pathname).toBe('/two');
    // });

    it('blocks back navigation in the browser until a blocker resolves', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one');

      await page.click('a');
      await page.waitForURL('/two');

      await goBack(page);

      expect(new URL(page.url()).pathname).toBe('/two');

      await page.evaluate(() => {
        window.Quilt!.E2E!.Waiter!.done('blocking');
      });
      await page.waitForURL('/one');

      expect(new URL(page.url()).pathname).toBe('/one');
    });

    it('handles navigation blocks that prevent going back more than one page in the stack', async () => {
      await using workspace = await Workspace.create({fixture: 'basic-app'});

      await workspace.fs.write({
        'foundation/Routes.tsx': multiline`
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
              {match: 'three', render: () => <PageThree />},
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

            return (
              <Link to="/three">To page three</Link>
            );
          }

          function PageThree() {
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

      const server = await startServer(workspace);
      const page = await server.openPage('/one');

      await page.click('a');
      await page.waitForURL('/two');

      await page.click('a');
      await page.waitForURL('/three');

      await goBack(page, {pages: 2});

      expect(new URL(page.url()).pathname).toBe('/three');

      await page.evaluate(() => {
        window.Quilt!.E2E!.Waiter!.done('blocking');
      });
      await page.waitForURL('/one');

      expect(new URL(page.url()).pathname).toBe('/one');
    });
  });
});

async function getScrollTop(page: Page, {selector}: {selector?: string} = {}) {
  const scroll = await page.evaluate(
    ({selector}) => {
      return selector
        ? document.querySelector(selector)!.scrollTop
        : document.documentElement.scrollTop;
    },
    {selector},
  );
  return scroll;
}

async function scrollTo(
  page: Page,
  scrollTo: number,
  {selector}: {selector?: string} = {},
) {
  await page.evaluate(
    async ({scrollTo, selector}) => {
      const target = selector
        ? document.querySelector<HTMLElement>(selector)!
        : document.documentElement;

      target.scrollTop = scrollTo;

      await new Promise<void>((resolve) => {
        target.offsetHeight;

        const interval = setInterval(() => {
          if (target.scrollTop === scrollTo) {
            clearInterval(interval);
            resolve();
          }
        }, 10);
      });
    },
    {scrollTo, selector},
  );
}

async function goBack(page: Page, {pages = 1} = {}) {
  await page.evaluate(
    ({pages}) => {
      window.history.go(-pages);
    },
    {pages},
  );

  await page.evaluate(async () => {});
}
