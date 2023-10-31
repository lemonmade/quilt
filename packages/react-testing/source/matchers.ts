import type {ComponentType, Context as ReactContext} from 'react';

import type {PropsFor} from './types.ts';

import {
  matchers,
  domMatchers,
  type CustomDOMMatchers,
} from '@quilted/preact-testing/matchers';

// @see https://vitest.dev/guide/extending-matchers.html
// This matches the Preact version of the custom matchers, but using React’s types instead.

export interface CustomMatchers<R = unknown> {
  toHaveReactProps(props: Record<string, unknown>): void;
  toContainReactComponent<Type extends string | ComponentType<any>>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): R;
  toContainReactComponentTimes<Type extends string | ComponentType<any>>(
    type: Type,
    times: number,
    props?: Partial<PropsFor<Type>>,
  ): R;
  toProvideReactContext<Type>(context: ReactContext<Type>, value?: Type): R;
  toContainReactText(text: string): R;
}

export {matchers, domMatchers, type CustomDOMMatchers};
