import type {GraphQLAnyOperation} from '../types.ts';

/**
 * A mock for a GraphQL operation that returns a dynamic result.
 */
export interface GraphQLMockFunction<Data, Variables> {
  /**
   * The operation being performed.
   */
  operation: GraphQLAnyOperation<Data, Variables>;

  /**
   * A function that will be called to resolve a single instance of
   * `operation`. This function is called with the variables used
   * for the operation, and should either return a `Data` object
   * (representing a successful result) or an `Error` object
   * (representing an error outside the operation execution).
   */
  result: (request: {variables: Variables}) => Data | Error;
}

/**
 * A mock for a GraphQL operation that returns a static result.
 */
export interface GraphQLMockObject<Data, Variables> {
  /**
   * The operation being performed.
   */
  operation: GraphQLAnyOperation<Data, Variables>;

  /**
   * The result of performing this operation. This value should
   *  either return a `Data` object (representing a successful result)
   * or an `Error` object (representing an error outside the operation
   * execution).
   */
  result: Data | Error;
}

/**
 * Any object that can be used to provide a mocked result for a GraphQL
 * query or mutation.
 */
export type GraphQLMock<Data, Variables> =
  | GraphQLMockFunction<Data, Variables>
  | GraphQLMockObject<Data, Variables>;
