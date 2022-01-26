import {
  Link,
  useRoutes,
  usePerformanceNavigation,
  useRouteChangeScrollRestoration,
} from '@quilted/quilt';
import type {PropsWithChildren} from '@quilted/quilt';

export function Routes() {
  return useRoutes([
    {match: 'one', render: () => <PageOne />},
    {match: 'two', render: () => <PageTwo />},
  ]);
}

function PageOne() {
  usePerformanceNavigation();
  const ref = useRouteChangeScrollRestoration('ScrollView');

  console.log('MOUNTING AGAIN');

  return (
    <>
      <Link to="/two">To page two</Link>
      <div
        id="ScrollView"
        ref={(result) => {
          console.log({settingRef: true, ref: result?.outerHTML});
          ref.current = result;
        }}
        style={{height: '100px', overflow: 'scroll', border: '1px solid black'}}
      >
        <ScrollSpacer>Scrollable</ScrollSpacer>
      </div>
    </>
  );
}

function PageTwo() {
  usePerformanceNavigation();

  return null;
}

function ScrollSpacer({children}: PropsWithChildren) {
  return (
    <>
      <div style={{height: '100px'}} />
      {children}
      <div style={{height: '200vh'}} />
    </>
  );
}
