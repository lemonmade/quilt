import {expect} from 'vitest';

import {matchers, type CustomMatchers} from '@quilted/preact-testing/matchers';
import {createRender, destroyAll} from '@quilted/preact-testing';

import {QuiltFrameworkContextPreact} from '@quilted/preact-context';
import {TestNavigation} from '../testing.tsx';

export {TestNavigation, destroyAll};

export const render = createRender<
  | {navigation?: TestNavigation; path?: never; base?: never}
  | {navigation?: never; path?: `/${string}`; base?: string | URL},
  {navigation: TestNavigation}
>({
  context({
    path = '/',
    base,
    navigation = new TestNavigation(new URL(path, 'https://example.com'), {
      base,
    }),
  }) {
    return {navigation};
  },
  render(element, {navigation}) {
    return (
      <QuiltFrameworkContextPreact.Provider value={{navigation}}>
        {element}
      </QuiltFrameworkContextPreact.Provider>
    );
  },
});

// @see https://vitest.dev/guide/extending-matchers.html
declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect` and `vitest`
expect.extend(matchers);
