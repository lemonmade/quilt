/**
 * @jest-environment jsdom
 */

import '@quilted/react-testing/matchers';

import React, {PropsWithChildren} from 'react';
import {createMount} from '@quilted/react-testing';

import {useRoutes, RouteDefinition} from '../routes';
import {createTestRouter, TestRouter} from '../../testing';

jest.mock('../redirect', () => ({
  useRedirect: jest.fn(),
}));

const {useRedirect} = jest.requireMock<{useRedirect: jest.Mock}>('../redirect');

const mount = createMount<
  {path?: string},
  {router: ReturnType<typeof createTestRouter>}
>({
  context({path}) {
    return {router: createTestRouter(path)};
  },
  // eslint-disable-next-line react/function-component-definition
  render(element, {router}) {
    return <TestRouter router={router}>{element}</TestRouter>;
  },
});

function RouteComponent({children}: PropsWithChildren<{}>) {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return children ? <>{children}</> : null;
}

function NestedRouteComponent({children}: PropsWithChildren<{}>) {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return children ? <>{children}</> : null;
}

describe('useRoutes()', () => {
  beforeEach(() => {
    useRedirect.mockReset();
  });

  describe('match', () => {
    describe('string', () => {
      it('matches a route based on an absolute path', () => {
        function Routes() {
          return useRoutes([{match: '/a', render: () => <RouteComponent />}]);
        }

        expect(mount(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested absolute paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: 'a',
              children: [{match: '/a/b', render: () => <RouteComponent />}],
            },
          ]);
        }

        expect(mount(<Routes />, {path: '/b/a'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b'})).toContainReactComponent(
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
                  match: '/a/b',
                  render: ({children}) => (
                    <RouteComponent>{children}</RouteComponent>
                  ),
                  children: [
                    {match: 'c', render: () => <NestedRouteComponent />},
                  ],
                },
              ],
            },
          ]);
        }

        expect(mount(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/d'})).toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/d'})).not.toContainReactComponent(
          NestedRouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          NestedRouteComponent,
        );
      });

      it('matches a route based on a relative path', () => {
        function Routes() {
          return useRoutes([{match: 'a', render: () => <RouteComponent />}]);
        }

        expect(mount(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a'})).toContainReactComponent(
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
                  children: [{match: 'c', render: () => <RouteComponent />}],
                },
              ],
            },
          ]);
        }

        expect(mount(<Routes />, {path: '/b/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/c/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested relative paths split across components', () => {
        function NestedRoutes() {
          return useRoutes([{match: 'b', render: () => <RouteComponent />}]);
        }

        function Routes() {
          return useRoutes([{match: 'a', render: () => <NestedRoutes />}]);
        }

        expect(mount(<Routes />, {path: '/a/b'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('removes trailing slashes before attempting to match a pathname', () => {
        function Routes() {
          return useRoutes([{match: '/a', render: () => <RouteComponent />}]);
        }

        expect(mount(<Routes />, {path: '/a/'})).toContainReactComponent(
          RouteComponent,
        );
      });
    });

    describe('regex', () => {
      it('matches a route based on an regex that matches an absolute path', () => {
        function Routes() {
          return useRoutes([{match: /\/a/, render: () => <RouteComponent />}]);
        }

        expect(mount(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested absolute paths', () => {
        function Routes() {
          return useRoutes([
            {
              match: /a/,
              children: [{match: /\/\w\/b/, render: () => <RouteComponent />}],
            },
          ]);
        }

        expect(mount(<Routes />, {path: '/b/a'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b'})).toContainReactComponent(
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
              children: [{match: 'c', render: () => <NestedRouteComponent />}],
            },
          ]);
        }

        expect(mount(<Routes />, {path: '/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/d'})).toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/d'})).not.toContainReactComponent(
          NestedRouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          NestedRouteComponent,
        );
      });

      it('matches a route based on a regex that matches a relative path', () => {
        function Routes() {
          return useRoutes([{match: /a/, render: () => <RouteComponent />}]);
        }

        expect(mount(<Routes />, {path: '/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a'})).toContainReactComponent(
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
                  children: [{match: /c/, render: () => <RouteComponent />}],
                },
              ],
            },
          ]);
        }

        expect(mount(<Routes />, {path: '/b/a/c'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/c/b'})).not.toContainReactComponent(
          RouteComponent,
        );

        expect(mount(<Routes />, {path: '/a/b/c'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('matches nested relative paths split across components', () => {
        function NestedRoutes() {
          return useRoutes([{match: /\w/, render: () => <RouteComponent />}]);
        }

        function Routes() {
          return useRoutes([{match: /\w/, render: () => <NestedRoutes />}]);
        }

        expect(mount(<Routes />, {path: '/a/b'})).toContainReactComponent(
          RouteComponent,
        );
      });

      it('removes trailing slashes before attempting to match a pathname', () => {
        function Routes() {
          return useRoutes([{match: /\/a$/, render: () => <RouteComponent />}]);
        }

        expect(mount(<Routes />, {path: '/a/'})).toContainReactComponent(
          RouteComponent,
        );
      });
    });

    describe('function', () => {
      it('is called with the current URL', () => {
        const match = jest.fn(() => false);

        function Routes() {
          return useRoutes([{match, render: () => <RouteComponent />}]);
        }

        const routes = mount(<Routes />, {path: '/a'});

        expect(match).toHaveBeenCalledWith(routes.context.router.currentUrl);
      });

      it('matches a route when a match function returns true', () => {
        function Routes() {
          return useRoutes([
            {match: () => true, render: () => <RouteComponent />},
          ]);
        }

        expect(mount(<Routes />)).toContainReactComponent(RouteComponent);
      });

      it('does not match a route when a match function returns false', () => {
        function Routes() {
          return useRoutes([
            {match: () => false, render: () => <RouteComponent />},
          ]);
        }

        expect(mount(<Routes />)).not.toContainReactComponent(RouteComponent);
      });

      it('does not consume the matched pathname when a match function returns true', () => {
        function Routes() {
          return useRoutes([
            {
              match: () => true,
              render: ({children}) => (
                <RouteComponent>{children}</RouteComponent>
              ),
              children: [{match: 'a', render: () => <NestedRouteComponent />}],
            },
          ]);
        }

        const noNestedMatchRoutes = mount(<Routes />, {path: '/b'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(
          noNestedMatchRoutes.find(RouteComponent),
        ).not.toContainReactComponent(NestedRouteComponent);

        const nestedMatchRoutes = mount(<Routes />, {path: '/a'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(nestedMatchRoutes.find(RouteComponent)).toContainReactComponent(
          NestedRouteComponent,
        );
      });
    });

    describe('fallback', () => {
      it('matches a route with no match property', () => {
        function Routes() {
          return useRoutes([{render: () => <RouteComponent />}]);
        }

        const routes = mount(<Routes />);

        expect(routes).toContainReactComponent(RouteComponent);
      });

      it('does not consume the matched pathname when there is no match property', () => {
        function Routes() {
          return useRoutes([
            {
              render: ({children}) => (
                <RouteComponent>{children}</RouteComponent>
              ),
              children: [{match: 'a', render: () => <NestedRouteComponent />}],
            },
          ]);
        }

        const noNestedMatchRoutes = mount(<Routes />, {path: '/b'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(
          noNestedMatchRoutes.find(RouteComponent),
        ).not.toContainReactComponent(NestedRouteComponent);

        const nestedMatchRoutes = mount(<Routes />, {path: '/a'});

        expect(noNestedMatchRoutes).toContainReactComponent(RouteComponent);
        expect(nestedMatchRoutes.find(RouteComponent)).toContainReactComponent(
          NestedRouteComponent,
        );
      });
    });

    it('only renders the first matching route', () => {
      function MatchedButNotRendered() {
        return null;
      }

      function Routes() {
        return useRoutes([
          {match: 'a', render: () => <RouteComponent />},
          {match: /a/, render: () => <MatchedButNotRendered />},
          {
            match: (url) => url.pathname === '/a',
            render: () => <MatchedButNotRendered />,
          },
          {render: () => <MatchedButNotRendered />},
        ]);
      }

      const routes = mount(<Routes />, {path: '/a'});

      expect(routes).toContainReactComponent(RouteComponent);
      expect(routes).not.toContainReactComponent(MatchedButNotRendered);
    });
  });

  describe('render', () => {
    it('calls the render function with the current URL', () => {
      const render = jest.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([{match: 'a', render}]);
      }

      const routes = mount(<Routes />, {path: '/a'});

      expect(render).toHaveBeenCalledWith(
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
            children: [{match: 'b', render: () => <NestedRouteComponent />}],
          },
        ]);
      }

      expect(
        mount(<Routes />, {path: '/a/b'}).find(RouteComponent),
      ).toContainReactComponent(NestedRouteComponent);
    });

    it('passes the matched pathname part to the render function', () => {
      const render = jest.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([{match: 'a', children: [{match: /\d+/, render}]}]);
      }

      mount(<Routes />, {path: '/a/123'});

      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({
          matchedPath: '123',
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

      mount(<Routes />, {path: '/a'});

      expect(useRedirect).toHaveBeenCalledWith(redirect);
    });
  });
});
