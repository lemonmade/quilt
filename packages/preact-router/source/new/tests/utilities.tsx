import {expect} from 'vitest';

import {matchers, type CustomMatchers} from '@quilted/preact-testing/matchers';
import {createRender, destroyAll} from '@quilted/preact-testing';
import type {Prefix} from '@quilted/routing';

import {TestRouter, Navigation} from '../testing.tsx';

export {TestRouter, destroyAll};

export const render = createRender<
  | {router?: TestRouter; path?: never; prefix?: never}
  | {router?: never; path?: `/${string}`; prefix?: Prefix},
  {router: TestRouter}
>({
  context({
    path = '/',
    // prefix,
    router = new TestRouter(new URL(path, 'https://example.com')),
  }) {
    return {router};
  },
  render(element, {router}) {
    return <Navigation router={router}>{element}</Navigation>;
  },
});

// @see https://vitest.dev/guide/extending-matchers.html
declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect` and `vitest`
expect.extend(matchers);
