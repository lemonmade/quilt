import {expect} from 'vitest';

import {matchers, type CustomMatchers} from '@quilted/react-testing/matchers';
import {createRender, destroyAll} from '@quilted/react-testing';
import type {Prefix} from '@quilted/routing';

import {TestRouter, TestRouting} from '../testing.tsx';

export {TestRouter, destroyAll};

export const render = createRender<
  | {router?: TestRouter; path?: never; prefix?: never}
  | {router?: never; path?: `/${string}`; prefix?: Prefix},
  {router: TestRouter}
>({
  context({
    path,
    prefix,
    router = new TestRouter(new URL(path ?? '/', 'https://example.com'), {
      prefix,
    }),
  }) {
    return {router};
  },
  render(element, {router}) {
    return <TestRouting router={router}>{element}</TestRouting>;
  },
});

// @see https://vitest.dev/guide/extending-matchers.html
declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect` and `vitest`
expect.extend(matchers);
