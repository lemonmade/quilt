import {mergeSchemas} from '@graphql-tools/merge';

export function createSchema(...definitions: string[]) {
  return mergeSchemas({
    schemas: [],
    typeDefs: definitions,
  });
}
