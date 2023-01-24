import {mergeSchemas} from '@graphql-tools/schema';

export function createGraphQLSchema(...definitions: string[]) {
  return mergeSchemas({typeDefs: definitions});
}
