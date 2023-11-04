import type {ComponentType, Context as ReactContext} from 'react';

import type {PropsFor} from './types.ts';

import {toContainReactHTML, toHaveReactDataProps} from './matchers/dom.ts';
import {toHaveReactProps} from './matchers/props.ts';
import {
  toContainReactComponent,
  toContainReactComponentTimes,
} from './matchers/components.ts';
import {toContainReactText} from './matchers/text.ts';
import {toProvideReactContext} from './matchers/context.ts';

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
  toContainReactHTML(text: string): R;
  toHaveReactDataProps(data: {[key: string]: string}): R;
}

export const matchers = {
  toHaveReactProps,
  toContainReactComponent,
  toContainReactComponentTimes,
  toProvideReactContext,
  toContainReactText,
  toContainReactHTML,
  toHaveReactDataProps,
};
