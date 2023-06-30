import type {GraphQLAnyOperation} from '../types.ts';

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
