import type {ComponentType, Context} from 'preact';

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
    : T extends ComponentType<infer Props>
    ? Props
    : never
  : T extends ComponentType<infer Props>
  ? Props
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

export type Predicate = (node: Node<unknown>) => boolean;

type MaybeFunctionReturnType<T> = T extends (...args: any[]) => any
  ? ReturnType<T>
  : unknown;
type MaybeFunctionParameters<T> = T extends (...args: any[]) => any
  ? Parameters<T>
  : [];

export interface Root<
  Props,
  Context extends PlainObject = EmptyObject,
  Actions extends PlainObject = EmptyObject,
> extends Node<Props> {
  readonly context: Context;
  readonly actions: Actions;
  readonly signal: AbortSignal;
  mount(): void;
  unmount(): void;
  setProps(props: Partial<Props>): void;
  act<T>(action: () => T, options?: {update?: boolean}): T;
  // Not until we need it...
  // forceUpdate(): void;
}

export interface Node<Props> {
  readonly props: Props;
  readonly type: string | ComponentType<any> | null;
  readonly instance: any;
  readonly children: (Node<unknown> | string)[];
  readonly descendants: (Node<unknown> | string)[];
  readonly text: string;
  readonly isDOM: boolean;
  readonly domNodes: HTMLElement[];
  readonly domNode: HTMLElement | null;
  readonly html: string;

  prop<K extends keyof Props>(key: K): Props[K];
  data(key: string): string | undefined;

  is<Type extends ComponentType<any> | string>(
    type: Type,
  ): this is Node<PropsFor<Type>>;

  find<Type extends ComponentType<any> | string>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): Node<PropsFor<Type>> | null;
  findAll<Type extends ComponentType<any> | string>(
    type: Type,
    props?: Partial<PropsFor<Type>>,
  ): Node<PropsFor<Type>>[];
  findWhere<Type extends ComponentType<any> | string = ComponentType<unknown>>(
    predicate: Predicate,
  ): Node<PropsFor<Type>> | null;
  findAllWhere<
    Type extends ComponentType<any> | string = ComponentType<unknown>,
  >(
    predicate: Predicate,
  ): Node<PropsFor<Type>>[];
  findContext<Type>(context: Context<Type>): Type | undefined;

  trigger<K extends FunctionKeys<Props>>(
    prop: K,
    ...args: DeepPartial<MaybeFunctionParameters<Props[K]>>
  ): MaybeFunctionReturnType<NonNullable<Props[K]>>;
  triggerKeypath<T = unknown>(keypath: string, ...args: unknown[]): T;

  debug(options?: DebugOptions): string;
  toString(): string;
}

export interface DebugOptions {
  all?: boolean;
  depth?: number;
  verbosity?: number;
}
