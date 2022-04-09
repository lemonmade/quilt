import {useMutation} from 'react-query';
import type {MutationOptions} from 'react-query';
import {useGraphQL} from '@quilted/quilt';
import type {GraphQL, GraphQLOperation} from '@quilted/quilt';

export type GraphQLMutationOptions<Data, Variables> = Omit<
  MutationOptions<Data, unknown, Variables>,
  'mutationFn'
> & {
  graphql?: GraphQL;
};

export function useGraphQLMutation<Data, Variables>(
  mutation: GraphQLOperation<Data, Variables> | string,
  {
    graphql: explicitGraphQL,
    mutationKey,
    ...reactMutationOptions
  }: GraphQLMutationOptions<Data, Variables> = {},
) {
  const graphqlFromContext = useGraphQL({required: false});
  const graphql = explicitGraphQL ?? graphqlFromContext;

  if (graphql == null) {
    throw new Error(
      `No GraphQL client found. You either need to have access to a GraphQL client in context, or pass one in as the \`graphql\` option to this function.`,
    );
  }

  return useMutation<Data, unknown, Variables>(
    [
      graphql,
      mutation,
      ...(Array.isArray(mutationKey) ? mutationKey : [mutationKey]),
    ],
    async (variables) => {
      const {data, error} = await graphql.mutate(mutation, {
        variables: variables as any,
      });

      if (error) {
        throw error;
      }

      return data!;
    },
    reactMutationOptions,
  );
}
