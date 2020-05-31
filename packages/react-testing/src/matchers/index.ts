import type {ComponentType, Context as ReactContext} from 'react';

import type {Node, PropsFor} from '../types';

import {toHaveReactProps} from './props';
import {
  toContainReactComponent,
  toContainReactComponentTimes,
} from './components';
import {toContainReactText} from './text';
import {toProvideReactContext} from './context';

type PropsFromNode<T> = NonNullable<T> extends Node<infer U, {}> ? U : never;

declare global {
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
