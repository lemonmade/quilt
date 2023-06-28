import type {TypedQueryDocumentNode} from 'graphql';
import type {IfAllFieldsNullable} from '@quilted/useful-types';

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

export interface GraphQLError {
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly locations?: readonly {
    readonly line: number;
    readonly column: number;
  }[];
}

export interface GraphQLFetchContext {}

export type GraphQLResult<Data, Extensions = Record<string, unknown>> =
  | {
      readonly data: Data;
      readonly errors?: never;
      readonly extensions?: Extensions;
    }
  | {
      readonly data?: Data | null;
      readonly errors: readonly GraphQLError[];
      readonly extensions?: Extensions;
    };

export interface GraphQLFetch<Extensions = Record<string, unknown>> {
  <Data = Record<string, unknown>, Variables = Record<string, unknown>>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options?: GraphQLVariableOptions<Variables> & {signal?: AbortSignal},
    context?: GraphQLFetchContext,
  ): GraphQLResult<Data, Extensions> | Promise<GraphQLResult<Data, Extensions>>;
}

export type GraphQLAnyOperation<Data, Variables> =
  | string
  | GraphQLOperation<Data, Variables>
  | TypedQueryDocumentNode<Data, Variables>;

export type GraphQLVariableOptions<Variables> = IfAllFieldsNullable<
  Variables,
  {variables?: Variables},
  {variables: Variables}
>;

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

export type MaybeNullableValue<T, V> = T extends null ? V | null : V;

export type IsUnion<T, If, Else> = Typenames<T> | '' extends Typenames<T>
  ? If
  : Else;

export type DeepPartialUnion<T> = T extends {__typename: string}
  ? T extends {__typename: ''}
    ? never
    : {__typename: T['__typename']} & GraphQLDeepPartialData<
        Omit<T, '__typename'>
      >
  : never;

export type Typenames<T> = T extends {__typename: string}
  ? T['__typename']
  : never;

// Mocks

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
