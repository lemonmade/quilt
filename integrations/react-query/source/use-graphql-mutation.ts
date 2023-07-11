import {useMutation, type UseMutationOptions} from '@tanstack/react-query';
import {
  useGraphQLFetch,
  type GraphQLFetch,
  type GraphQLOperation,
} from '@quilted/quilt/graphql';

import {throwIfError} from './utilities.ts';

export type GraphQLMutationOptions<Data, Variables> = Omit<
  UseMutationOptions<Data, unknown, Variables>,
  'mutationFn'
> & {
  fetch?: GraphQLFetch;
};

export function useGraphQLMutation<Data, Variables>(
  mutation: GraphQLOperation<Data, Variables> | string,
  {
    fetch: explicitFetch,
    mutationKey,
    ...reactMutationOptions
  }: GraphQLMutationOptions<Data, Variables> = {},
) {
  const fetchFromContext = useGraphQLFetch({required: false});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error(
      `No GraphQL fetch found. You either need to have access to a GraphQL fetch in context, or pass one in as the \`fetch\` option to this function.`,
    );
  }

  return useMutation<Data, unknown, Variables>(
    [
      fetch,
      mutation,
      ...(Array.isArray(mutationKey) ? mutationKey : [mutationKey]),
    ],
    async (variables) => {
      const result = await fetch(
        typeof mutation === 'string'
          ? {id: mutation, source: mutation}
          : mutation,
        {
          variables: variables as any,
        },
      );

      throwIfError(result);

      return result.data!;
    },
    reactMutationOptions,
  );
}
