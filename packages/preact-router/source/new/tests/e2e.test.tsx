// @vitest-environment jsdom

import {describe, it, expect, afterEach, vi} from 'vitest';
import type {RenderableProps} from 'preact';

import {useRoutes, route} from '../index.ts';
import {render, destroyAll} from '../tests/utilities.tsx';

vi.mock('../redirect', () => ({
  useRedirect: vi.fn(),
}));

function RouteComponent({children}: RenderableProps<{}>) {
  return children ? <>{children}</> : null;
}

function NestedRouteComponent({children}: RenderableProps<{}>) {
  return children ? <>{children}</> : null;
}

describe('useRoutes()', () => {
  afterEach(() => {
    destroyAll();
  });

  describe('match', () => {
    describe('string', () => {
      it('matches the root path', () => {
        function Routes() {
          return useRoutes([{match: '/', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches a route based on an absolute path', () => {
        function Routes() {
          return useRoutes([{match: '/a', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
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

        expect(render(<Routes />, {path: '/b/a'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/c'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b'})).toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches a combination of nested absolute and relative paths', () => {
        const routes = [
          route('a', {
            children: [
              route('/b', {
                render: ({children}) => (
                  <RouteComponent>{children}</RouteComponent>
                ),
                children: [route('c', {render: <NestedRouteComponent />})],
              }),
            ],
          }),
        ];

        function Routes() {
          return useRoutes(routes);
        }

        expect(render(<Routes />, {path: '/a/c'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b/d'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(
          render(<Routes />, {path: '/a/b/d'}),
        ).not.toContainPreactComponent(NestedRouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainPreactComponent(
          NestedRouteComponent,
        );
      });

      it('matches a route based on a relative path', () => {
        function Routes() {
          return useRoutes([{match: 'a', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
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

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
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
        ).not.toContainPreactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: '/a/c/b'}),
        ).not.toContainPreactComponent(RouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainPreactComponent(
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

        expect(render(<Routes />, {path: '/a/b'})).toContainPreactComponent(
          RouteComponent,
        );
      });

      it('removes trailing slashes before attempting to match a pathname', () => {
        function Routes() {
          return useRoutes([{match: '/a', render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/a/'})).toContainPreactComponent(
          RouteComponent,
        );
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
        ).toContainPreactComponent(RouteComponent);
      });
    });

    describe('regex', () => {
      it('matches the root path', () => {
        function Routes() {
          return useRoutes([{match: /^\/$/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches the root path in a complex regex', () => {
        function Routes() {
          return useRoutes([
            {match: /\/some-route|^\/$/, render: <RouteComponent />},
          ]);
        }

        expect(render(<Routes />, {path: '/'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches a route based on an regex that matches an absolute path', () => {
        function Routes() {
          return useRoutes([{match: /\/a/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
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

        expect(render(<Routes />, {path: '/b/a'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/c'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b'})).toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches a combination of nested absolute and relative paths', () => {
        function Routes() {
          return useRoutes([
            route(/\/\w\/b/, {
              render: ({children}) => (
                <RouteComponent>{children}</RouteComponent>
              ),
              children: [{match: /c/, render: <NestedRouteComponent />}],
            }),
          ]);
        }

        expect(render(<Routes />, {path: '/a/c'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a/b/d'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(
          render(<Routes />, {path: '/a/b/d'}),
        ).not.toContainPreactComponent(NestedRouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainPreactComponent(
          NestedRouteComponent,
        );
      });

      it('matches a route based on a regex that matches a relative path', () => {
        function Routes() {
          return useRoutes([{match: /a/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
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
        ).not.toContainPreactComponent(RouteComponent);

        expect(
          render(<Routes />, {path: '/a/c/b'}),
        ).not.toContainPreactComponent(RouteComponent);

        expect(render(<Routes />, {path: '/a/b/c'})).toContainPreactComponent(
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

        expect(render(<Routes />, {path: '/a/b'})).toContainPreactComponent(
          RouteComponent,
        );
      });

      it('removes trailing slashes before attempting to match a pathname', () => {
        function Routes() {
          return useRoutes([{match: /\/a$/, render: <RouteComponent />}]);
        }

        expect(render(<Routes />, {path: '/a/'})).toContainPreactComponent(
          RouteComponent,
        );
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
        ).toContainPreactComponent(RouteComponent);
      });
    });
  });
});
