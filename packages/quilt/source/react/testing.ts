import {expect} from 'vitest';
import {matchers, type CustomMatchers} from '@quilted/react-testing/matchers';

export {
  render,
  createRender,
  rendered,
  destroyAll,
} from '@quilted/react-testing/preact';
export type * from '@quilted/react-testing/dom';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect()` and vitest
expect.extend(matchers);
