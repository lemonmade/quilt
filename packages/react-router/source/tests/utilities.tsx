import '@quilted/react-testing/matchers';

import {createRender} from '@quilted/react-testing';
import type {Prefix} from '@quilted/routing';

import {createTestRouter, TestRouting} from '../testing.tsx';

export {createTestRouter};

export const render = createRender<
  | {router?: ReturnType<typeof createTestRouter>; path?: never; prefix?: never}
  | {router?: never; path?: `/${string}`; prefix?: Prefix},
  {router: ReturnType<typeof createTestRouter>}
>({
  context({path, prefix, router = createTestRouter(path, {prefix})}) {
    return {router};
  },
  render(element, {router}) {
    return <TestRouting router={router}>{element}</TestRouting>;
  },
});
