import type {
  TypedQueryDocumentNode,
  FormattedExecutionResult,
  GraphQLFormattedError,
} from 'graphql';

/**
 * A base type expressing anything that can be used to represent a
 * single GraphQL operation.
 */
export interface GraphQLOperationType<
  Data = unknown,
  Variables = Record<string, unknown>,
> {
  // We need something to actually use the types, otherwise TypeScript
  // "discards" them for inference on extending interfaces.
  readonly __typeData?: Data;
  readonly __typeVariables?: Variables;
}

/**
 * An object with a simplified representation of a GraphQL query or mutation.
 */
export interface GraphQLOperation<
  Data = unknown,
  Variables = Record<string, unknown>,
> extends GraphQLOperationType<Data, Variables> {
  /**
   * A unique identifier for this operation. This is usually a hash of the
   * operation’s source.
   */
  id: string;

  /**
   * The query or mutation name being performed. If more than one operation
   * is contained in the source, this is required, as it tells the GraphQL
   * server which operation to run.
   */
  name?: string;

  /**
   * The source content of the query or mutation. We recommend minifying the
   * source in this property so that fetches of this document contain the
   * smallest possible payload.
   */
  source: GraphQLSource<Data, Variables>;
}

/**
 * A GraphQL operation source, with the types of the operation attached.
 */
export type GraphQLSource<
  Data = unknown,
  Variables = Record<string, unknown>,
> = string & GraphQLOperationType<Data, Variables>;

/**
 * Any of the basic options for expressing a GraphQL operation:
 *
 * - A `GraphQLOperation` object, providing the key details of a query or mutation
 * - A `DocumentNode` object, representing a parsed GraphQL query or mutation
 * - A `string` containing the source of a GraphQL query or mutation
 */
export type GraphQLAnyOperation<
  Data = unknown,
  Variables = Record<string, unknown>,
> =
  | GraphQLSource<Data, Variables>
  | GraphQLOperation<Data, Variables>
  | TypedQueryDocumentNode<Data, Variables>;

/**
 * If the passed type can resolve to a GraphQL operation, resolves to the
 * type of the data that the operation will return. Otherwise, resolves to
 * `never`.
 */
export type GraphQLData<T> =
  T extends GraphQLOperationType<infer Data, any>
    ? Data
    : T extends TypedQueryDocumentNode<infer Data, any>
      ? Data
      : never;

/**
 * If the passed type can resolve to a GraphQL operation, resolves to the
 * type of the variables that the operation should receive. Otherwise, resolves to
 * `never`.
 */
export type GraphQLVariables<T> =
  T extends GraphQLOperationType<any, infer Variables>
    ? Variables
    : T extends TypedQueryDocumentNode<any, infer Variables>
      ? Variables
      : never;

/**
 * An error that occurred while performing a GraphQL operation.
 */
export type GraphQLError = GraphQLFormattedError;

/**
 * The result of performing a GraphQL query or mutation.
 */
export type GraphQLResult<
  Data,
  Extensions = Record<string, unknown>,
> = FormattedExecutionResult<Data, Extensions>;

/**
 * A function that can be used to perform a GraphQL query or mutation.
 *
 * @param operation - The query or mutation to perform. This value can be
 * provided as a `GraphQLOperation` object, a `TypedQueryDocumentNode`, or
 * a string containing the GraphQL source.
 *
 * @param options - Additional options to use when performing this query or
 * mutation.
 *
 * @param context - Additional context to provide to the fetcher. To provide
 * type-safe access to this additional context, you can extend the `GraphQLFetchContext`
 * type from this library.
 */
export interface GraphQLRun<Context = {}, Extensions = {}> {
  <Data = Record<string, unknown>, Variables = Record<string, unknown>>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options?: GraphQLOperationOptions<Data, Variables>,
    context?: Context,
  ): Promise<GraphQLResult<Data, Extensions>>;
}

/**
 * A single result from a streamed GraphQL response. This result includes
 * the typical GraphQL result payload, as well as some additional fields
 * that are used for `@defer` and `@stream` directives in a GraphQL operation.
 */
export interface GraphQLStreamingIncrementalResult<Extensions> {
  label?: string | null;
  path: readonly (string | number)[];
  // For @defer
  data?: Record<string, unknown> | null;
  // For @stream
  items?: readonly unknown[] | null;
  errors?: GraphQLResult<unknown, Extensions>['errors'] | null;
  extensions?: Partial<Extensions>;
}

/**
 * The combined result of performing a GraphQL query or mutation that can
 * be streamed. This result includes the typical GraphQL result payload, as
 * well as the latest incrementally-applied result, and a flag indicating
 * whether or not there are more results to come.
 */
export interface GraphQLStreamingResult<Data, Extensions>
  extends GraphQLResult<Data, Extensions> {
  /**
   * The last incrementally-applied result from the GraphQL operation.
   */
  incremental?: GraphQLStreamingIncrementalResult<Extensions>[];

  /**
   * Whether or not there are more results to come.
   */
  hasNext?: boolean;
}

/**
 * The result of a streaming GraphQL fetcher. This value is both a
 * promise (which resolves with the final result of the operation, after
 * the last incremental result has been applied), and an async iterator
 * (which yields the combined result as incremental patches are streamed
 * from the server).
 */
export type GraphQLStreamingOperationResult<Data, Extensions> = Promise<
  GraphQLResult<Data, Extensions>
> &
  AsyncIterableIterator<GraphQLStreamingResult<Data, Extensions>>;

/**
 * A function that can be used to perform a streaming GraphQL query or mutation.
 *
 * @param operation - The query or mutation to perform. This value can be
 * provided as a `GraphQLOperation` object, a `TypedQueryDocumentNode`, or
 * a string containing the GraphQL source.
 *
 * @param options - Additional options to use when performing this query or
 * mutation.
 *
 * @param context - Additional context to provide to the fetcher. To provide
 * type-safe access to this additional context, you can extend the `GraphQLFetchContext`
 * type from this library.
 */
export interface GraphQLStreamingRun<
  Context = Record<string, unknown>,
  Extensions = Record<string, unknown>,
> {
  <Data = Record<string, unknown>, Variables = Record<string, unknown>>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options?: GraphQLStreamingOperationOptions<Data, Variables>,
    context?: Context,
  ): GraphQLStreamingOperationResult<Data, Extensions>;
}

/**
 * Options that can be provided to an individual `fetch()` of a
 * GraphQL operation.
 */
export interface GraphQLOperationOptions<_Data, Variables>
  extends GraphQLVariableOptions<Variables> {
  /**
   * An abort signal that can be used to cancel the request.
   */
  signal?: AbortSignal;

  /**
   * The name of the query or mutation to perform. This is only required when
   * you pass a GraphQL document that contains multiple operations.
   */
  operationName?: string;
}

/**
 * Options that can be provided to an individual `fetch()` of a
 * GraphQL operation.
 */
export interface GraphQLStreamingOperationOptions<Data, Variables>
  extends GraphQLOperationOptions<Data, Variables> {}

/**
 * A helper type that resolves to an object with a `variables` property that
 * must match the provided `Variables` generic type.
 */
export interface GraphQLVariableOptions<Variables> {
  variables?: Variables;
}

/**
 * Picks the type in `T` that is a GraphQL object with a `__typename` of `Type`.
 * This can be useful for extracting a specific type from a union or intersection.
 *
 * @example
 * import type {MyQueryData} from './MyQuery.graphql';
 *
 * type AdminProfile = PickGraphQLType<MyQueryData.Profile, 'AdminProfile'>;
 * // `{__typename: 'AdminProfile', ...}`
 */
export type PickGraphQLType<T, Type extends GraphQLTypenames<T>> = Extract<
  T,
  {readonly __typename: Type}
>;

// Partial data

/**
 * Takes the type of `Data` that a GraphQL operation will return, and
 * resolves to a type that represents a “deep partial” of this data. This
 * resulting type can be useful for tests, where it can represent any allowed
 * subset of a GraphQL operation’s data.
 */
export type GraphQLDeepPartialData<Data> = {
  [K in keyof Data]?: GraphQLMaybeNullableValue<
    Data[K],
    NonNullable<Data[K]> extends readonly (infer U)[]
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
      : NonNullable<Data[K]> extends Record<string, any>
        ? GraphQLIsUnion<
            NonNullable<Data[K]>,
            GraphQLDeepPartialUnion<NonNullable<Data[K]>>,
            GraphQLDeepPartialData<NonNullable<Data[K]>>
          >
        : NonNullable<Data[K]>
  >;
};

/**
 * A helper type for matching the nullability of a GraphQL type in another
 * type.
 */
export type GraphQLMaybeNullableValue<T, V> = T extends null ? V | null : V;

/**
 * If `T` is a union or intersection type, then resolve to `If`. Otherwise,
 * resolve to `Else`.
 */
export type GraphQLIsUnion<T, If, Else = never> =
  GraphQLTypenames<T> | '' extends GraphQLTypenames<T> ? If : Else;

/**
 * A helper that picks a deep union of an object, with special handling
 * for union and intersection `__typename` fields.
 */
export type GraphQLDeepPartialUnion<T> = T extends {__typename: string}
  ? T extends {__typename: ''}
    ? never
    : {__typename: T['__typename']} & GraphQLDeepPartialData<
        Omit<T, '__typename'>
      >
  : never;

/**
 * A helper that picks all the possible value for `__typename` in the
 * generic type argument.
 */
export type GraphQLTypenames<T> = T extends {__typename: string}
  ? T['__typename']
  : never;
