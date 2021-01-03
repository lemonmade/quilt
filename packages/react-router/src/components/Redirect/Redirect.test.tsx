import {createMount} from '@quilted/react-testing';

import {createTestRouter, TestRouter} from '../../testing';
import {Redirect} from './Redirect';

describe('<Redirect />', () => {
  it('works', () => {
    const to = '/my/path';
    const redirect = mountWithNavigateSpy(<Redirect to={to} />);

    expect(redirect.context.router.navigate).toHaveBeenCalledWith(to, {
      replace: true,
    });
  });
});

type MockedRouter = Omit<ReturnType<typeof createTestRouter>, 'navigate'> & {
  navigate: jest.Mock;
};

const mountWithNavigateSpy = createMount<
  Record<string, never>,
  {router: MockedRouter}
>({
  context() {
    const router = createTestRouter(
      new URL('https://router.magic'),
    ) as MockedRouter;
    jest.spyOn(router, 'navigate');
    return {router};
  },
  // The auto-fix for this causes syntax errors...
  // eslint-disable-next-line react/function-component-definition
  render(element, {router}) {
    return <TestRouter router={router}>{element}</TestRouter>;
  },
});
