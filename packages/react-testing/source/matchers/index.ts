import type {ComponentType, Context as ReactContext} from 'react';

import type {PropsFor} from '../types.ts';

import {toHaveReactProps} from './props.ts';
import {
  toContainReactComponent,
  toContainReactComponentTimes,
} from './components.ts';
import {toContainReactText} from './text.ts';
import {toProvideReactContext} from './context.ts';

// @see https://vitest.dev/guide/extending-matchers.html

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

export const matchers = {
  toHaveReactProps,
  toContainReactComponent,
  toContainReactComponentTimes,
  toProvideReactContext,
  toContainReactText,
};
