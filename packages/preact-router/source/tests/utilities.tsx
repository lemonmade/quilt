import {expect} from 'vitest';

import {matchers, type CustomMatchers} from '@quilted/preact-testing/matchers';
import {createRender, destroyAll} from '@quilted/preact-testing';

import {TestRouter, Navigation} from '../testing.tsx';

export {TestRouter, destroyAll};

export const render = createRender<
  | {router?: TestRouter; path?: never; base?: never}
  | {router?: never; path?: `/${string}`; base?: string | URL},
  {router: TestRouter}
>({
  context({
    path = '/',
    base,
    router = new TestRouter(new URL(path, 'https://example.com'), {base}),
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
