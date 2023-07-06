import {
  type GraphQLResult,
  type GraphQLError as GraphQLErrorType,
} from '@quilted/quilt/graphql';

class GraphQLError extends Error {
  readonly path?: GraphQLErrorType['path'];
  readonly locations?: GraphQLErrorType['locations'];

  constructor({message, path, locations}: GraphQLErrorType) {
    super(message);
    this.path = path;
    this.locations = locations;
  }
}

export function throwIfError(result: GraphQLResult<any>) {
  if (result.errors) {
    throw new GraphQLError(result.errors[0]!);
  }
}
