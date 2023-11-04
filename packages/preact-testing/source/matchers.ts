import type {ComponentType, Context} from 'preact';

import type {PropsFor} from './types.ts';

import {toContainPreactHTML, toHavePreactDataProps} from './matchers/dom.ts';
import {toHavePreactProps} from './matchers/props.ts';
import {
  toContainPreactComponent,
  toContainPreactComponentTimes,
} from './matchers/components.ts';
import {toContainPreactText} from './matchers/text.ts';
import {toProvidePreactContext} from './matchers/context.ts';

// @see https://vitest.dev/guide/extending-matchers.html

export interface CustomMatchers<R = unknown> {
  toHavePreactProps(props: Record<string, unknown>): void;
  toContainPreactComponent<Type extends string | ComponentType<any>>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): R;
  toContainPreactComponentTimes<Type extends string | ComponentType<any>>(
    type: Type,
    times: number,
    props?: Partial<PropsFor<Type>>,
  ): R;
  toProvidePreactContext<Type>(context: Context<Type>, value?: Type): R;
  toContainPreactText(text: string): R;
  toContainPreactHTML(text: string): R;
  toHavePreactDataProps(data: {[key: string]: string}): R;
}

export const matchers = {
  toHavePreactProps,
  toContainPreactComponent,
  toContainPreactComponentTimes,
  toProvidePreactContext,
  toContainPreactText,
  toContainPreactHTML,
  toHavePreactDataProps,
};
