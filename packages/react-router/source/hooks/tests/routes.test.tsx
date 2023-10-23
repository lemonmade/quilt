import {describe, it, expect, beforeEach, vi} from 'vitest';
import type {PropsWithChildren} from 'react';

import {useRoutes} from '../routes.tsx';
import {useRedirect} from '../redirect.ts';
import {render} from '../../tests/utilities.tsx';

vi.mock('../redirect', () => ({
  useRedirect: vi.fn(),
}));

function RouteComponent({children}: PropsWithChildren<{}>) {
  return children ? <>{children}</> : null;
}

function NestedRouteComponent({children}: PropsWithChildren<{}>) {
  return children ? <>{children}</> : null;
}

describe('useRoutes()', () => {
  beforeEach(() => {
    (useRedirect as any).mockReset();
  });

  describe('match', () => {
    describe('string', () => {
      it('matches the root path', () => {
        function Routes() {
          return useRoutes([{match: '/', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches a route based on an absolute path', () => {
        function Routes() {
          return useRoutes([{match: '/a', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested absolute paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: 'a',
              children: [{match: '/b', render: <RouteComponent />}],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/b/a'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches a combination of nested absolute and relative paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: '/a',
              children: [
                {
                  match: '/b',
                  render: ({children}) => (
                    <RouteComponent>{children}</RouteComponent>
                  ),
                  children: [{match: 'c', render: <NestedRouteComponent />}],
                },
              ],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b/d'})).toContainReactComponent(
          RouteComponent,
        );

        expect(
          render(<Routes />, {path: '/a/b/d'}),
        ).not.toContainReactComponent(NestedRouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          NestedRouteComponent,
        );
      });

      it('matches a route based on a relative path', () => {
        function Routes() {
          return useRoutes([{match: 'a', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches the root path on a nested route', () => {
        function Routes() {
          return useRoutes([
            {
              match: 'a',
              children: [{match: '/', render: <RouteComponent />}],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested relative paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: 'a',
              children: [
                {
                  match: 'b',
                  children: [{match: 'c', render: <RouteComponent />}],
                },
              ],
            },
          ]);
        }

        expect(
          render(<Routes />, {path: '/b/a/c'}),
        ).not.toContainReactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: '/a/c/b'}),
        ).not.toContainReactComponent(RouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested relative paths split across components', () => {
        function NestedRoutes() {
          return useRoutes([{match: 'b', render: <RouteComponent />}]);
        }

        function Routes() {
          return useRoutes([
            {match: 'a', exact: false, render: <NestedRoutes />},
          ]);
        }

        expect(render(<Routes />, {path: '/a/b'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('removes trailing slashes before attempting to match a pathname', () => {
        function Routes() {
          return useRoutes([{match: '/a', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/a/'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches with a prefix', () => {
        const prefix = '/my-prefix';

        function Routes() {
          return useRoutes([{match: '/', render: <RouteComponent />}]);
        }

        expect(
          render(<Routes />, {path: prefix, prefix}),
        ).toContainReactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: `${prefix}/`, prefix}),
        ).toContainReactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: `${prefix}/a`, prefix}),
        ).not.toContainReactComponent(RouteComponent);
      });

      it('does not match partial path segments', () => {
        function OtherComponent() {
          return null;
        }

        function Routes() {
          return useRoutes([
            {match: 'must', render: <OtherComponent />},
            {
              match: 'must-match',
              children: [
                {match: 'full', render: <OtherComponent />},
                {match: 'full-path', render: <RouteComponent />},
              ],
            },
          ]);
        }

        expect(
          render(<Routes />, {path: '/must-match/full-path'}),
        ).toContainReactComponent(RouteComponent);
      });
    });

    describe('regex', () => {
      it('matches the root path', () => {
        function Routes() {
          return useRoutes([{match: /^\/$/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches the root path in a complex regex', () => {
        function Routes() {
          return useRoutes([
            {match: /\/some-route|^\/$/, render: <RouteComponent />},
          ]);
        }

        expect(render(<Routes />, {path: '/'})).toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches a route based on an regex that matches an absolute path', () => {
        function Routes() {
          return useRoutes([{match: /\/a/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested absolute paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: /a/,
              children: [{match: /\/b/, render: <RouteComponent />}],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/b/a'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches a combination of nested absolute and relative paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: /\/\w\/b/,
              render: ({children}) => (
                <RouteComponent>{children}</RouteComponent>
              ),
              children: [{match: /c/, render: <NestedRouteComponent />}],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b/d'})).toContainReactComponent(
          RouteComponent,
        );

        expect(
          render(<Routes />, {path: '/a/b/d'}),
        ).not.toContainReactComponent(NestedRouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          NestedRouteComponent,
        );
      });

      it('matches a route based on a regex that matches a relative path', () => {
        function Routes() {
          return useRoutes([{match: /a/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested relative paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: /a/,
              children: [
                {
                  match: /b/,
                  children: [{match: /c/, render: <RouteComponent />}],
                },
              ],
            },
          ]);
        }

        expect(
          render(<Routes />, {path: '/b/a/c'}),
        ).not.toContainReactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: '/a/c/b'}),
        ).not.toContainReactComponent(RouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested relative paths split across components', () => {
        function NestedRoutes() {
          return useRoutes([{match: /\w/, render: <RouteComponent />}]);
        }

        function Routes() {
          return useRoutes([
            {match: /\w/, exact: false, render: <NestedRoutes />},
          ]);
        }

        expect(render(<Routes />, {path: '/a/b'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('removes trailing slashes before attempting to match a pathname', () => {
        function Routes() {
          return useRoutes([{match: /\/a$/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/a/'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches with a prefix', () => {
        const prefix = /\/[^/]*/;
        const prefixMatch = '/my-prefix';

        function Routes() {
          return useRoutes([{match: /^\/$/, render: <RouteComponent />}]);
        }

        expect(
          render(<Routes />, {path: prefixMatch, prefix}),
        ).toContainReactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: `${prefixMatch}/`, prefix}),
        ).toContainReactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: `${prefixMatch}/a`, prefix}),
        ).not.toContainReactComponent(RouteComponent);
      });

      it('does not match partial path segments', () => {
        function OtherComponent() {
          return null;
        }

        function Routes() {
          return useRoutes([
            {match: /must/, render: <OtherComponent />},
            {
              match: /must-match/,
              children: [
                {match: /^[/]full/, render: <OtherComponent />},
                {match: /^[/]full-path/, render: <RouteComponent />},
              ],
            },
          ]);
        }

        expect(
          render(<Routes />, {path: '/must-match/full-path'}),
        ).toContainReactComponent(RouteComponent);
      });
    });

    describe('function', () => {
      it('is called with the current URL', () => {
        const match = vi.fn(() => false);

        function Routes() {
          return useRoutes([{match, render: <RouteComponent />}]);
        }

        const routes = render(<Routes />, {path: '/a'});

        expect(match).toHaveBeenCalledWith(routes.context.router.currentUrl);
      });

      it('matches a route when a match function returns true', () => {
        function Routes() {
          return useRoutes([{match: () => true, render: <RouteComponent />}]);
        }

        expect(render(<Routes />)).toContainReactComponent(RouteComponent);
      });

      it('does not match a route when a match function returns false', () => {
        function Routes() {
          return useRoutes([{match: () => false, render: <RouteComponent />}]);
        }

        expect(render(<Routes />)).not.toContainReactComponent(RouteComponent);
      });

      it('does not consume the matched pathname when a match function returns true', () => {
        function Routes() {
          return useRoutes([
            {
              match: () => true,
              render: ({children}) => (
                <RouteComponent>{children}</RouteComponent>
              ),
              children: [{match: 'a', render: <NestedRouteComponent />}],
            },
          ]);
        }

        const noNestedMatchRoutes = render(<Routes />, {path: '/b'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(
          noNestedMatchRoutes.find(RouteComponent),
        ).not.toContainReactComponent(NestedRouteComponent);

        const nestedMatchRoutes = render(<Routes />, {path: '/a'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(nestedMatchRoutes.find(RouteComponent)).toContainReactComponent(
          NestedRouteComponent,
        );
      });
    });

    describe('array', () => {
      it('matches if any of the elements matches', () => {
        function Routes() {
          return useRoutes([
            {
              match: ['a', /b/, ({pathname}) => pathname === '/c'],
              render: <RouteComponent />,
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/b'})).toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/c'})).toContainReactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/d'})).not.toContainReactComponent(
          RouteComponent,
        );
      });
    });

    describe('fallback', () => {
      it('matches a route with no match property', () => {
        function Routes() {
          return useRoutes([{render: <RouteComponent />}]);
        }

        const routes = render(<Routes />);

        expect(routes).toContainReactComponent(RouteComponent);
      });

      it('does not consume the matched pathname when there is no match property', () => {
        function Routes() {
          return useRoutes([
            {
              render: ({children}) => (
                <RouteComponent>{children}</RouteComponent>
              ),
              children: [{match: 'a', render: <NestedRouteComponent />}],
            },
          ]);
        }

        const noNestedMatchRoutes = render(<Routes />, {path: '/b'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(
          noNestedMatchRoutes.find(RouteComponent),
        ).not.toContainReactComponent(NestedRouteComponent);

        const nestedMatchRoutes = render(<Routes />, {path: '/a'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(nestedMatchRoutes.find(RouteComponent)).toContainReactComponent(
          NestedRouteComponent,
        );
      });
    });

    describe('exact', () => {
      it('renders routes without children only if they are an exact match by default', () => {
        function Routes() {
          return useRoutes([{match: 'a', render: <RouteComponent />}]);
        }

        const routes = render(<Routes />, {path: '/a/b/c'});

        expect(routes).not.toContainReactComponent(RouteComponent);
      });

      it('allows routes without children to be inexact', () => {
        function Routes() {
          return useRoutes([
            {match: 'a', exact: false, render: <RouteComponent />},
          ]);
        }

        const routes = render(<Routes />, {path: '/a/b/c'});

        expect(routes).toContainReactComponent(RouteComponent);
      });
    });

    it('only renders the first matching route', () => {
      function MatchedButNotRendered() {
        return null;
      }

      function Routes() {
        return useRoutes([
          {match: 'a', render: <RouteComponent />},
          {match: /a/, render: <MatchedButNotRendered />},
          {
            match: (url) => url.pathname === '/a',
            render: <MatchedButNotRendered />,
          },
          {render: <MatchedButNotRendered />},
        ]);
      }

      const routes = render(<Routes />, {path: '/a'});

      expect(routes).toContainReactComponent(RouteComponent);
      expect(routes).not.toContainReactComponent(MatchedButNotRendered);
    });
  });

  describe('render', () => {
    it('calls the render function with the current URL', () => {
      const renderRoute = vi.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([{match: 'a', render: renderRoute}]);
      }

      const routes = render(<Routes />, {path: '/a'});

      expect(renderRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: routes.context.router.currentUrl,
        }),
      );
    });

    it('passes children routes to the render function', () => {
      function Routes() {
        return useRoutes([
          {
            match: 'a',
            render: ({children}) => <RouteComponent>{children}</RouteComponent>,
            children: [{match: 'b', render: <NestedRouteComponent />}],
          },
        ]);
      }

      expect(
        render(<Routes />, {path: '/a/b'}).find(RouteComponent),
      ).toContainReactComponent(NestedRouteComponent);
    });

    it('passes the matched pathname part to the render function', () => {
      const renderRoute = vi.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([
          {match: 'a', children: [{match: /\d+/, render: renderRoute}]},
        ]);
      }

      render(<Routes />, {path: '/a/123'});

      expect(renderRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          matched: '123',
        }),
      );
    });
  });

  describe('redirect', () => {
    it('calls the redirect hook with the redirect option', () => {
      const redirect = '/redirected';

      function Routes() {
        return useRoutes([{match: 'a', redirect}]);
      }

      render(<Routes />, {path: '/a'});

      expect(useRedirect).toHaveBeenCalledWith(redirect);
    });
  });
});
