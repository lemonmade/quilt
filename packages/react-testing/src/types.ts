import React from 'react';

export type PropsFor<
  T extends string | React.ComponentType<any>
> = T extends string
  ? T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T]
    : T extends React.ComponentType<any>
    ? React.ComponentPropsWithoutRef<T>
    : React.HTMLAttributes<T>
  : T extends React.ComponentType<any>
  ? React.ComponentPropsWithoutRef<T>
  : never;

export type FunctionKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: any[]) => any
    ? K
    : never;
}[keyof T];

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends readonly (infer U)[]
  ? readonly DeepPartial<U>[]
  : T extends object
  ? {
      [K in keyof T]?: DeepPartial<T[K]>;
    }
  : T;

export type Predicate<Extensions extends object> = (
  node: Node<unknown, Extensions>,
) => boolean;

type MaybeFunctionReturnType<T> = T extends (...args: any[]) => any
  ? ReturnType<T>
  : unknown;

export interface Root<Props, Context extends object | undefined = undefined> {
  readonly context: Context;
  mount(): void;
  unmount(): void;
  setProps(props: Partial<Props>): void;
  act<T>(action: () => T, options?: {update?: boolean}): T;
  // Not until we need it...
  // forceUpdate(): void;
}

export interface NodeApi<Props, Extensions extends object> {
  readonly props: Props;
  readonly type: string | React.ComponentType<any> | null;
  readonly instance: any;
  readonly children: (Node<unknown, Extensions> | string)[];
  readonly descendants: (Node<unknown, Extensions> | string)[];
  readonly text: string;

  prop<K extends keyof Props>(key: K): Props[K];

  // text(): string;

  is<Type extends React.ComponentType<any> | string>(
    type: Type,
  ): this is Node<PropsFor<Type>, Extensions>;

  find<Type extends React.ComponentType<any> | string>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): Node<PropsFor<Type>, Extensions> | null;
  findAll<Type extends React.ComponentType<any> | string>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): Node<PropsFor<Type>, Extensions>[];
  findWhere(predicate: Predicate<Extensions>): Node<unknown> | null;
  findAllWhere(predicate: Predicate<Extensions>): Node<unknown>[];

  trigger<K extends FunctionKeys<Props>>(
    prop: K,
    ...args: DeepPartial<Parameters<Props[K]>>
  ): MaybeFunctionReturnType<NonNullable<Props[K]>>;
  triggerKeypath<T = unknown>(keypath: string, ...args: unknown[]): T;

  debug(options?: DebugOptions): string;
  toString(): string;
}

export type Node<Props, Extensions extends object = {}> = NodeApi<
  Props,
  Extensions
> &
  Omit<Extensions, keyof Root<any>>;

export interface DebugOptions {
  allProps?: boolean;
  depth?: number;
  verbosity?: number;
}

export interface HtmlNodeExtensions {
  readonly isDom: boolean;
  readonly domNodes: HTMLElement[];
  readonly domNode: HTMLElement | null;
  readonly html: string;
  readonly text: string;
  data(key: string): string | undefined;
}
