import type {DocumentNode} from 'graphql';
import type {IfUnionSize} from '@quilted/useful-types';

export interface GraphQLOperationType<
  Data = unknown,
  Variables = Record<string, unknown>,
> {
  // We need something to actually use the types, otherwise TypeScript
  // "discards" them for inference on extending interfaces.
  readonly __typeData?: Data;
  readonly __typeVariables?: Variables;
}

export interface GraphQLOperation<
  Data = unknown,
  Variables = Record<string, unknown>,
> extends GraphQLOperationType<Data, Variables> {
  id: string;
  name?: string;
  source: string;
}

export type GraphQLData<T> = T extends GraphQLOperationType<infer Data, any>
  ? Data
  : never;

export type GraphQLVariables<T> = T extends GraphQLOperationType<
  any,
  infer Variables
>
  ? Variables
  : never;

export interface GraphQLRequest<Data, Variables> {
  operation: GraphQLOperation<Data, Variables>;
  variables: Variables;
}

export interface GraphQLRequestContext<T = Record<string, unknown>> {
  has<K extends keyof T>(key: K): boolean;
  get<K extends keyof T>(key: K): T[K] | undefined;
  set<K extends keyof T>(key: K, value: T[K]): this;
  delete<K extends keyof T>(key: K): boolean;
}

export type GraphQLFetch<T = Record<string, unknown>> = (
  request: GraphQLRequest<unknown, unknown>,
  context: GraphQLRequestContext<T>,
) => Promise<Record<string, any>>;

export type GraphQLResult<Data> =
  | {
      data: Data;
      error?: undefined;
    }
  | {data?: undefined; error: Error};

export type GraphQLAnyOperation<Data, Variables> =
  | string
  | DocumentNode
  | GraphQLOperation<Data, Variables>;

export interface GraphQLMockFunction<Data, Variables> {
  operation: GraphQLAnyOperation<Data, Variables>;
  result: (request: {variables: Variables}) => Data | Error;
}

export interface GraphQLMockObject<Data, Variables> {
  operation: GraphQLAnyOperation<Data, Variables>;
  result: Data | Error;
}

export type GraphQLMock<Data, Variables> =
  | GraphQLMockFunction<Data, Variables>
  | GraphQLMockObject<Data, Variables>;

type NonNullableKeys<T> = {
  [K in keyof T]-?: null extends T[K] ? never : K;
}[keyof T];

export type IfAllVariablesOptional<Obj, If, Else = never> = IfUnionSize<
  NonNullableKeys<Obj>,
  0,
  If,
  Else
>;

export type IfEmptyObject<Obj, If, Else = never> = IfUnionSize<
  keyof Obj,
  0,
  If,
  Else
>;

export type VariableOptions<Variables> = IfEmptyObject<
  Variables,
  {variables?: never},
  IfAllVariablesOptional<
    Variables,
    {variables?: Variables},
    {variables: Variables}
  >
>;

export type QueryOptions<_Data, Variables> = {
  cache?: boolean;
} & VariableOptions<Variables>;

export type MutationOptions<_Data, Variables> = VariableOptions<Variables>;

export type PickGraphQLType<T, Type extends Typenames<T>> = Extract<
  T,
  {readonly __typename: Type}
>;

// Partial data

export type GraphQLDeepPartialData<T> = {
  [K in keyof T]?: MaybeNullableValue<
    T[K],
    NonNullable<T[K]> extends readonly (infer U)[]
      ? readonly MaybeNullableValue<
          U,
          NonNullable<U> extends Record<string, any>
            ? IsUnion<
                NonNullable<U>,
                DeepPartialUnion<NonNullable<U>>,
                GraphQLDeepPartialData<NonNullable<U>>
              >
            : NonNullable<U>
        >[]
      : NonNullable<T[K]> extends Record<string, any>
      ? IsUnion<
          NonNullable<T[K]>,
          DeepPartialUnion<NonNullable<T[K]>>,
          GraphQLDeepPartialData<NonNullable<T[K]>>
        >
      : NonNullable<T[K]>
  >;
};

type MaybeNullableValue<T, V> = T extends null ? V | null : V;

type IsUnion<T, If, Else> = Typenames<T> | '' extends Typenames<T> ? If : Else;

type DeepPartialUnion<T> = T extends {__typename: string}
  ? T extends {__typename: ''}
    ? never
    : {__typename: T['__typename']} & GraphQLDeepPartialData<
        Omit<T, '__typename'>
      >
  : never;

type Typenames<T> = T extends {__typename: string} ? T['__typename'] : never;
