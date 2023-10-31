import {expect} from 'vitest';

import {matchers, type CustomMatchers} from './testing/matchers.ts';

export * from '@quilted/graphql/testing';
export {GraphQLTesting} from '@quilted/react-graphql/testing';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect()` and vitest
expect.extend(matchers);
