import {describe, it, expect, vi, type MockInstance} from 'vitest';
import {createRender} from '@quilted/react-testing';

import {TestRouter, TestRouting} from '../../testing.tsx';
import {Redirect} from './Redirect.tsx';

describe('<Redirect />', () => {
  it('works', () => {
    const to = '/my/path';
    const redirect = renderWithNavigateSpy(<Redirect to={to} />);

    expect(redirect.context.router.navigate).toHaveBeenCalledWith(to, {
      replace: true,
    });
  });

  it('works with relativeTo', () => {
    const to = '/my/path';
    const redirect = renderWithNavigateSpy(
      <Redirect to={to} relativeTo="root" />,
    );

    expect(redirect.context.router.navigate).toHaveBeenCalledWith(to, {
      replace: true,
      relativeTo: 'root',
    });
  });
});

type MockedRouter = TestRouter & {
  navigate: MockInstance;
};

const renderWithNavigateSpy = createRender<
  Record<string, never>,
  {router: MockedRouter}
>({
  context() {
    const router = new TestRouter(
      new URL('https://router.magic'),
    ) as MockedRouter;
    vi.spyOn(router, 'navigate');
    return {router};
  },
  render(element, {router}) {
    return <TestRouting router={router}>{element}</TestRouting>;
  },
});
