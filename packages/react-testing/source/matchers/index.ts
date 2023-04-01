import type {ComponentType, Context as ReactContext} from 'react';

import type {Node, PropsFor} from '../types.ts';

import {toHaveReactProps} from './props.ts';
import {
  toContainReactComponent,
  toContainReactComponentTimes,
} from './components.ts';
import {toContainReactText} from './text.ts';
import {toProvideReactContext} from './context.ts';

import {expect} from '@jest/globals';

type PropsFromNode<T> = NonNullable<T> extends Node<infer U, any> ? U : never;

declare global {
  // As far as I know, this is needed for the module augmentation  to work.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toHaveReactProps(props: Partial<PropsFromNode<T>>): void;
      toContainReactComponent<Type extends string | ComponentType<any>>(
        type: Type,
        props?: Partial<PropsFor<Type>>,
      ): void;
      toContainReactComponentTimes<Type extends string | ComponentType<any>>(
        type: Type,
        times: number,
        props?: Partial<PropsFor<Type>>,
      ): void;
      toProvideReactContext<Type>(
        context: ReactContext<Type>,
        value?: Type,
      ): void;
      toContainReactText(text: string): void;
    }
  }
}

expect.extend({
  toHaveReactProps,
  toContainReactComponent,
  toContainReactComponentTimes,
  toProvideReactContext,
  toContainReactText,
});
