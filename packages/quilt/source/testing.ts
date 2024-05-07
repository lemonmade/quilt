import {expect} from 'vitest';
import {matchers, type CustomMatchers} from '@quilted/preact-testing/matchers';

export * from '@quilted/preact-testing';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect()` and vitest
expect.extend(matchers);
