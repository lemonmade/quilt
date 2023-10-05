import type {TypedQueryDocumentNode} from 'graphql';
import type {
  GraphQLSource,
  GraphQLAnyOperation,
  GraphQLOperation,
} from './types.ts';

/**
 * Converts the common formats of representing a GraphQL query or mutation
 * into Quilt’s `GraphQLOperation` shape.
 */
export function toGraphQLOperation<Data, Variables>(
  operation: GraphQLAnyOperation<Data, Variables>,
  partial?: Partial<GraphQLOperation<Data, Variables>>,
): GraphQLOperation<Data, Variables> {
  if (typeof operation === 'string') {
    return {id: operation, source: operation, name: partial?.name};
  } else if ('definitions' in operation) {
    const source = sourceForGraphQLDocumentNode(operation);
    const name = partial?.name ?? operation.definitions[0]?.name?.value;
    return {id: source, source, name};
  } else {
    return operation;
  }
}

/**
 * Returns the source string of a GraphQL operation, regardless of the format.
 */
export function toGraphQLSource<Data, Variables>(
  operation: GraphQLAnyOperation<Data, Variables>,
) {
  if (typeof operation === 'string') {
    return operation;
  } else if ('definitions' in operation) {
    return sourceForGraphQLDocumentNode(operation);
  } else {
    return operation.source;
  }
}

function sourceForGraphQLDocumentNode<Data, Variables>(
  document: TypedQueryDocumentNode<Data, Variables>,
): GraphQLSource<Data, Variables> {
  const source = document.loc?.source.body;

  if (!source) {
    throw new Error(`Can’t determine source for document node: ${document}`);
  }

  return source;
}
