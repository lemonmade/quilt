// @vitest-environment jsdom

import {describe, it, expect, afterEach, vi} from 'vitest';
import type {RenderableProps} from 'preact';

import {useRoutes} from '../index.ts';
import {render, destroyAll} from '../tests/utilities.tsx';

vi.mock('../redirect', () => ({
  useRedirect: vi.fn(),
}));

function RouteComponent({children}: RenderableProps<{}>) {
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
    });
  });
});
