import type {TypedQueryDocumentNode, FormattedExecutionResult} from 'graphql';
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
  : T extends TypedQueryDocumentNode<infer Data, any>
  ? Data
  : never;

export type GraphQLVariables<T> = T extends GraphQLOperationType<
  any,
  infer Variables
>
  ? Variables
  : T extends TypedQueryDocumentNode<any, infer Variables>
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

export type GraphQLResult<
  Data,
  Extensions = Record<string, unknown>,
> = FormattedExecutionResult<Data, Extensions>;

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

export type PickGraphQLType<T, Type extends GraphQLTypenames<T>> = Extract<
  T,
  {readonly __typename: Type}
>;

// Partial data

export type GraphQLDeepPartialData<T> = {
  [K in keyof T]?: GraphQLMaybeNullableValue<
    T[K],
    NonNullable<T[K]> extends readonly (infer U)[]
      ? readonly GraphQLMaybeNullableValue<
          U,
          NonNullable<U> extends Record<string, any>
            ? GraphQLIsUnion<
                NonNullable<U>,
                GraphQLDeepPartialUnion<NonNullable<U>>,
                GraphQLDeepPartialData<NonNullable<U>>
              >
            : NonNullable<U>
        >[]
      : NonNullable<T[K]> extends Record<string, any>
      ? GraphQLIsUnion<
          NonNullable<T[K]>,
          GraphQLDeepPartialUnion<NonNullable<T[K]>>,
          GraphQLDeepPartialData<NonNullable<T[K]>>
        >
      : NonNullable<T[K]>
  >;
};

export type GraphQLMaybeNullableValue<T, V> = T extends null ? V | null : V;

export type GraphQLIsUnion<T, If, Else> =
  | GraphQLTypenames<T>
  | '' extends GraphQLTypenames<T>
  ? If
  : Else;

export type GraphQLDeepPartialUnion<T> = T extends {__typename: string}
  ? T extends {__typename: ''}
    ? never
    : {__typename: T['__typename']} & GraphQLDeepPartialData<
        Omit<T, '__typename'>
      >
  : never;

export type GraphQLTypenames<T> = T extends {__typename: string}
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
