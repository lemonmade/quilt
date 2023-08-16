import type {
  TypedQueryDocumentNode,
  FormattedExecutionResult,
  GraphQLFormattedError,
} from 'graphql';
import type {IfAllFieldsNullable} from '@quilted/useful-types';

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
export type GraphQLData<T> = T extends GraphQLOperationType<infer Data, any>
  ? Data
  : T extends TypedQueryDocumentNode<infer Data, any>
  ? Data
  : never;

/**
 * If the passed type can resolve to a GraphQL operation, resolves to the
 * type of the variables that the operation should receive. Otherwise, resolves to
 * `never`.
 */
export type GraphQLVariables<T> = T extends GraphQLOperationType<
  any,
  infer Variables
>
  ? Variables
  : T extends TypedQueryDocumentNode<any, infer Variables>
  ? Variables
  : never;

/**
 * An error that occurred while performing a GraphQL operation.
 */
export type GraphQLError = GraphQLFormattedError;

/**
 * An object containing context provided to Quilt’s `GraphQLFetch`
 * implementations. This can be used to provide or return additional
 * information within these fetchers that goes beyond the typical
 * GraphQL inputs and outputs.
 *
 * If you are creating a custom `GraphQLFetch` implementation, you can
 * augment this type to add additional, type-safe context.
 *
 * @example
 * declare module '@quilted/graphql' {
 *   interface GraphQLFetchContext {
 *     response?: Response;
 *   }
 * }
 *
 * const fetch: GraphQLFetch = async (operation, options, context) => {
 *   if (context) {
 *     // You can read or write to this context
 *     console.log(context.response);
 *   }
 * }
 */
export interface GraphQLFetchContext {}

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
export interface GraphQLFetch<Extensions = Record<string, unknown>> {
  <Data = Record<string, unknown>, Variables = Record<string, unknown>>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options?: GraphQLHttpFetchOperationOptions<Data, Variables>,
    context?: GraphQLFetchContext,
  ): GraphQLResult<Data, Extensions> | Promise<GraphQLResult<Data, Extensions>>;
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
export type GraphQLStreamingFetchResult<Data, Extensions> = Promise<
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
export interface GraphQLStreamingFetch<Extensions = Record<string, unknown>> {
  <Data = Record<string, unknown>, Variables = Record<string, unknown>>(
    operation: GraphQLAnyOperation<Data, Variables>,
    options?: GraphQLHttpFetchOperationOptions<Data, Variables>,
    context?: GraphQLFetchContext,
  ): GraphQLStreamingFetchResult<Data, Extensions>;
}

/**
 * Options that can be provided to an individual `fetch()` of a
 * GraphQL operation.
 */
export type GraphQLHttpFetchOperationOptions<_Data, Variables> = Pick<
  GraphQLVariableOptions<Variables>,
  'variables'
> & {
  /**
   * The URL to send GraphQL requests to.
   */
  url?: string | URL;

  /**
   * The HTTP headers to send with GraphQL requests. This can be any object
   * that can be used to construct a `Headers` instance.
   */
  headers?: HeadersInit;

  /**
   * The HTTP method to use for this GraphQL. This should be either `GET` or
   * `POST`, corresponding to the HTTP verb that will be used for the request.
   * This will override any default method set for the `GraphQLFetch` function
   * performing the request.
   */
  method?: 'GET' | 'POST';

  /**
   * Overrides the operation source included in the GraphQL request.
   *
   * If this option is a string, it will be used as the operation source, regardless
   * of the `operation` provided to the `GraphQLFetchRequest` constructor.
   *
   * If this option is `false`, the operation source will not be sent as part
   * of the request. This may be used to implement "persisted queries", where
   * the operation is stored on the server, and the client sends only the
   * hash of the request.
   *
   * If this option is `true` or omitted, the operation source will be inferred
   * from the `operation` argument you provide.
   */
  source?: string | boolean;

  /**
   * Additional metadata to send alongside your GraphQL request. This content will
   * be sent as the `extensions` request parameter.
   */
  extensions?: Record<string, any>;

  /**
   * An abort signal that can be used to cancel the request.
   */
  signal?: AbortSignal;
};

/**
 * A helper type that resolves to an object with a `variables` property that
 * must match the provided `Variables` generic type. If all fields in `Variables`
 * can be `null` or `undefined`, then the `variables` property will be optional.
 */
export type GraphQLVariableOptions<Variables> = IfAllFieldsNullable<
  Variables,
  {variables?: Variables},
  {variables: Variables}
>;

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
  | GraphQLTypenames<T>
  | '' extends GraphQLTypenames<T>
  ? If
  : Else;

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
