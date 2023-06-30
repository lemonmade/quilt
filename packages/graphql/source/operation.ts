import {GraphQLAnyOperation, GraphQLOperation} from './types.ts';

export function toGraphQLOperation<Data, Variables>(
  operation: GraphQLAnyOperation<Data, Variables>,
): GraphQLOperation<Data, Variables> {
  if (typeof operation === 'string') {
    return {id: operation, source: operation};
  } else if ('definitions' in operation) {
    const source = operation.loc?.source.body ?? '';
    if (!source) {
      throw new Error(`Can’t determine source for document node: ${operation}`);
    }

    const name = operation.definitions[0]?.name?.value;

    return {id: source, source, name};
  } else {
    return operation;
  }
}
