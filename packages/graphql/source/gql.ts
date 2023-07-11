import type {GraphQLSource} from './types.ts';

export const graphql: <Data = unknown, Variables = Record<string, unknown>>(
  template: {raw: readonly string[] | ArrayLike<string>},
  ...substitutions: any[]
) => GraphQLSource<Data, Variables> = String.raw;

export {graphql as gql};
