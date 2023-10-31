import {expect} from 'vitest';
import {matchers, CustomMatchers} from '@quilted/react-testing/matchers';

export {
  render,
  createRender,
  rendered,
  destroyAll,
} from '@quilted/react-testing';
export type {
  CustomRender,
  CustomRenderResult,
  CustomRenderOptions,
  CustomRenderExtendOptions,
  HookRunner,
  Environment,
  EnvironmentOptions,
  ContextOption,
  RenderOption,
  ActionsOption,
  Node,
  NodeApi,
  Root,
  RootApi,
  DebugOptions,
  EmptyObject,
  PlainObject,
  Predicate,
} from '@quilted/react-testing';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// @ts-expect-error Incompatibilities between `expect()` and vitest
expect.extend(matchers);
