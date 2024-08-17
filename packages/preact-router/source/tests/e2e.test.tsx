// @vitest-environment jsdom

import {describe, it, expect, afterEach, vi} from 'vitest';
import type {RenderableProps} from 'preact';

import {
  route,
  useRoutes,
  useRouteData,
  type RouteNavigationEntry,
} from '../index.ts';
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
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: '/', render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: '/'}),
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches the root path with an empty string', () => {
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: '', render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: ''}),
        );

        expect(render(<Routes />, {path: '/a'})).not.toContainPreactComponent(
          RouteComponent,
        );
      });

      it('matches a route based on an absolute path', () => {
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: '/a', render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: '/a'}),
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
                render: (children) => (
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
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: 'a', render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: 'a'}),
        );
      });

      it('matches a route based on a single path segment pattern', () => {
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: ':id', render: renderSpy}]);
        }

        expect(
          render(<Routes />, {path: '/thing/abc'}),
        ).not.toContainPreactComponent(RouteComponent);

        expect(render(<Routes />, {path: '/abc'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({
            matched: 'abc',
          }),
        );
      });

      it('matches a route based on a single absolute path segment pattern', () => {
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: '/:id', render: renderSpy}]);
        }

        expect(
          render(<Routes />, {path: '/thing/abc'}),
        ).not.toContainPreactComponent(RouteComponent);

        expect(render(<Routes />, {path: '/abc'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({
            matched: 'abc',
          }),
        );
      });

      it('matches the root path on a nested route', () => {
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([
            {
              match: 'a',
              children: [{match: '/', render: renderSpy}],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: '/'}),
        );
      });

      it('matches the root path on a nested route with an empty string', () => {
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([
            {
              match: 'a',
              children: [{match: '', render: renderSpy}],
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: ''}),
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
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: /^\/$/, render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({matched: expect.arrayContaining(['/'])}),
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
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: /\/(?<id>a)/, render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({
            matched: expect.objectContaining({0: '/a', groups: {id: 'a'}}),
          }),
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
              render: (children) => <RouteComponent>{children}</RouteComponent>,
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
        const renderSpy = vi.fn(() => <RouteComponent />);

        function Routes() {
          return useRoutes([{match: /(?<id>a)/, render: renderSpy}]);
        }

        expect(render(<Routes />, {path: '/b'})).not.toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );
        expect(renderSpy).toHaveBeenLastCalledWith(
          null,
          expect.objectContaining({
            matched: expect.objectContaining({0: 'a', groups: {id: 'a'}}),
          }),
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

    describe('array', () => {
      it('matches if any of the elements matches', () => {
        function Routes() {
          return useRoutes([
            {
              match: ['a', 'b'],
              render: <RouteComponent />,
            },
          ]);
        }

        expect(render(<Routes />, {path: '/a'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/b'})).toContainPreactComponent(
          RouteComponent,
        );

        expect(render(<Routes />, {path: '/c'})).not.toContainPreactComponent(
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

        expect(routes).toContainPreactComponent(RouteComponent);
      });

      it('matches a route with a match property of *', () => {
        function Routes() {
          return useRoutes([{match: '*', render: <RouteComponent />}]);
        }

        const routes = render(<Routes />);

        expect(routes).toContainPreactComponent(RouteComponent);
      });

      it('matches a route with a match property of true', () => {
        function Routes() {
          return useRoutes([{match: true, render: <RouteComponent />}]);
        }

        const routes = render(<Routes />);

        expect(routes).toContainPreactComponent(RouteComponent);
      });

      it('matches a nested fallback routes', () => {
        function Routes() {
          return useRoutes([
            {
              match: '*',
              render: <RouteComponent />,
              children: [{render: <NestedRouteComponent />}],
            },
          ]);
        }

        const routes = render(<Routes />, {path: '/foo/bar'});

        expect(routes).toContainPreactComponent(NestedRouteComponent);
      });

      it('does not consume the matched pathname when there is no match property', () => {
        function Routes() {
          return useRoutes([
            {
              render: (children) => <RouteComponent>{children}</RouteComponent>,
              children: [{match: 'a', render: <NestedRouteComponent />}],
            },
          ]);
        }

        const noNestedMatchRoutes = render(<Routes />, {path: '/b'});

        expect(noNestedMatchRoutes).toContainPreactComponent(RouteComponent);
        expect(
          noNestedMatchRoutes.find(RouteComponent),
        ).not.toContainPreactComponent(NestedRouteComponent);

        const nestedMatchRoutes = render(<Routes />, {path: '/a'});

        expect(noNestedMatchRoutes).toContainPreactComponent(RouteComponent);
        expect(nestedMatchRoutes.find(RouteComponent)).toContainPreactComponent(
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

        expect(routes).not.toContainPreactComponent(RouteComponent);
      });

      it('allows routes without children to be inexact', () => {
        function Routes() {
          return useRoutes([
            {match: 'a', exact: false, render: <RouteComponent />},
          ]);
        }

        const routes = render(<Routes />, {path: '/a/b/c'});

        expect(routes).toContainPreactComponent(RouteComponent);
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
          {render: <MatchedButNotRendered />},
        ]);
      }

      const routes = render(<Routes />, {path: '/a'});

      expect(routes).toContainPreactComponent(RouteComponent);
      expect(routes).not.toContainPreactComponent(MatchedButNotRendered);
    });
  });

  describe('base', () => {
    it('matches the root path, removing the base prefix', () => {
      const renderSpy = vi.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([{match: '/', render: renderSpy}]);
      }

      expect(
        render(<Routes />, {path: '/a', base: '/a'}),
      ).toContainPreactComponent(RouteComponent);
      expect(renderSpy).toHaveBeenLastCalledWith(
        null,
        expect.objectContaining({matched: '/'}),
      );

      expect(render(<Routes />, {path: '/a'})).not.toContainPreactComponent(
        RouteComponent,
      );
    });

    it('matches relative paths, removing the base prefix', () => {
      const renderSpy = vi.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([{match: 'b/c', render: renderSpy}]);
      }

      expect(
        render(<Routes />, {path: '/a/b/c', base: '/a'}),
      ).toContainPreactComponent(RouteComponent);
      expect(renderSpy).toHaveBeenLastCalledWith(
        null,
        expect.objectContaining({matched: 'b/c'}),
      );
    });

    it('matches regular expression paths, removing the base prefix', () => {
      const renderSpy = vi.fn(() => <RouteComponent />);

      function Routes() {
        return useRoutes([{match: /b[/]c/, render: renderSpy}]);
      }

      expect(
        render(<Routes />, {path: '/a/b/c', base: '/a'}),
      ).toContainPreactComponent(RouteComponent);
      expect(renderSpy).toHaveBeenLastCalledWith(
        null,
        expect.objectContaining({matched: expect.objectContaining({0: 'b/c'})}),
      );
    });
  });

  describe('load', () => {
    it('can load data for a matched route', async () => {
      function RouteComponent() {
        const data = useRouteData<{id: string; title: string}>();

        return <div>Title: {data.title}</div>;
      }

      const context = {fetch: () => Promise.resolve({id: 'abc'})};
      const loadDeferred = new Deferred<{id: string; title: string}>();
      const keySpy = vi.fn(
        (entry: Pick<RouteNavigationEntry<any, any>, 'request'>) => {
          return entry.request.url.pathname;
        },
      );
      const inputSpy = vi.fn((entry: RouteNavigationEntry<any, any>) => {
        return {id: entry.matched};
      });
      const loadSpy = vi.fn((_entry: RouteNavigationEntry<any, any>) => {
        return loadDeferred.promise;
      });
      const renderSpy = vi.fn((_entry: RouteNavigationEntry<any, any>) => {
        return <RouteComponent />;
      });

      function Routes() {
        return useRoutes(
          [
            route('a', {
              key: (entry) => keySpy(entry),
              input: (entry) => inputSpy(entry),
              load: (entry) => loadSpy({...entry, input: entry.input}),
              render: (_, entry) =>
                renderSpy({...entry, data: entry.data, input: entry.input}),
            }),
          ],
          {context},
        );
      }

      const routes = render(<Routes />, {path: '/a'});
      await routes.act(async () => {
        loadDeferred.resolve({id: 'a', title: 'A resource'});
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(routes).toContainPreactComponent(RouteComponent);
      expect(routes).toContainPreactText('Title: A resource');

      expect(keySpy).toHaveBeenCalledTimes(1);
      expect(keySpy).toHaveBeenCalledWith(
        expect.objectContaining({context, matched: 'a'}),
      );

      expect(inputSpy).toHaveBeenCalledTimes(1);
      expect(inputSpy).toHaveBeenCalledWith(
        expect.objectContaining({context, matched: 'a'}),
      );

      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenCalledWith(
        expect.objectContaining({context, matched: 'a', input: {id: 'a'}}),
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(renderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context,
          matched: 'a',
          input: {id: 'a'},
          data: {id: 'a', title: 'A resource'},
        }),
      );
    });
  });
});

class Deferred<T = unknown> {
  resolve!: (value: T) => void;
  reject!: (value: any) => void;
  promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}
