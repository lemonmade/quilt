import {expect} from 'vitest';
import {matchers, type CustomMatchers} from '@quilted/react-testing/matchers';

export * from 'vitest';

export type * from '@quilted/preact-testing';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect()` and vitest
expect.extend(matchers);
