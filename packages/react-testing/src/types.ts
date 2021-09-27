import type {
  ComponentType,
  ComponentPropsWithoutRef,
  HTMLAttributes,
  Context,
} from 'react';

export type PlainObject = Record<string, any>;
export type EmptyObject = Record<string, never>;
export type MergeObjects<T, U> = T extends EmptyObject
  ? U extends EmptyObject
    ? EmptyObject
    : U
  : U extends EmptyObject
  ? T
  : T & U;

export type PropsFor<T extends string | ComponentType<any>> = T extends string
  ? T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T]
    : T extends ComponentType<any>
    ? ComponentPropsWithoutRef<T>
    : HTMLAttributes<T>
  : T extends ComponentType<any>
  ? ComponentPropsWithoutRef<T>
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
  : T extends PlainObject
  ? {
      [K in keyof T]?: DeepPartial<T[K]>;
    }
  : T;

export type Predicate<Extensions extends PlainObject> = (
  node: Node<unknown, Extensions>,
) => boolean;

type MaybeFunctionReturnType<T> = T extends (...args: any[]) => any
  ? ReturnType<T>
  : unknown;

export interface RootApi<
  Props,
  Context extends PlainObject = EmptyObject,
  Actions extends PlainObject = EmptyObject,
> {
  readonly context: Context;
  readonly actions: Actions;
  mount(): void;
  unmount(): void;
  setProps(props: Partial<Props>): void;
  act<T>(action: () => T, options?: {update?: boolean}): T;
  // Not until we need it...
  // forceUpdate(): void;
}

export interface NodeApi<Props, Extensions extends PlainObject = EmptyObject> {
  readonly props: Props;
  readonly type: string | ComponentType<any> | null;
  readonly instance: any;
  readonly children: (Node<unknown, Extensions> | string)[];
  readonly descendants: (Node<unknown, Extensions> | string)[];
  readonly text: string;

  prop<K extends keyof Props>(key: K): Props[K];

  is<Type extends ComponentType<any> | string>(
    type: Type,
  ): this is Node<PropsFor<Type>, Extensions>;

  find<Type extends ComponentType<any> | string>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): Node<PropsFor<Type>, Extensions> | null;
  findAll<Type extends ComponentType<any> | string>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): Node<PropsFor<Type>, Extensions>[];
  findWhere<Type extends ComponentType<any> | string = ComponentType<unknown>>(
    predicate: Predicate<Extensions>,
  ): Node<PropsFor<Type>, Extensions> | null;
  findAllWhere<
    Type extends ComponentType<any> | string = ComponentType<unknown>,
  >(
    predicate: Predicate<Extensions>,
  ): Node<PropsFor<Type>, Extensions>[];
  findContext<Type>(context: Context<Type>): Type | undefined;

  trigger<K extends FunctionKeys<Props>>(
    prop: K,
    ...args: DeepPartial<Parameters<Props[K]>>
  ): MaybeFunctionReturnType<NonNullable<Props[K]>>;
  triggerKeypath<T = unknown>(keypath: string, ...args: unknown[]): T;

  debug(options?: DebugOptions): string;
  toString(): string;
}

export type Node<
  Props,
  Extensions extends PlainObject = EmptyObject,
> = EmptyObject extends Extensions
  ? NodeApi<Props, Extensions>
  : NodeApi<Props, Extensions> & Omit<Extensions, keyof Root<any>>;

export type Root<
  Props,
  Context extends PlainObject = EmptyObject,
  Actions extends PlainObject = EmptyObject,
  Extensions extends PlainObject = EmptyObject,
> = Node<Props, Extensions> & RootApi<Props, Context, Actions>;

export interface DebugOptions {
  all?: boolean;
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
