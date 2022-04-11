import {mergeSchemas} from '@graphql-tools/schema';

export function createSchema(...definitions: string[]) {
  return mergeSchemas({typeDefs: definitions});
}
