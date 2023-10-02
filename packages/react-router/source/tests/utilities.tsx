import '@quilted/react-testing/matchers';

import {createRender} from '@quilted/react-testing';
import type {Prefix} from '@quilted/routing';

import {TestRouter, TestRouting} from '../testing.tsx';

export {TestRouter};

export const render = createRender<
  | {router?: TestRouter; path?: never; prefix?: never}
  | {router?: never; path?: `/${string}`; prefix?: Prefix},
  {router: TestRouter}
>({
  context({path, prefix, router = new TestRouter(path, {prefix})}) {
    return {router};
  },
  render(element, {router}) {
    return <TestRouting router={router}>{element}</TestRouting>;
  },
});
