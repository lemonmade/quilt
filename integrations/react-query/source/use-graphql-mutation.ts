import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  toGraphQLSource,
  useGraphQLFetch,
  type GraphQLFetch,
  type GraphQLAnyOperation,
} from '@quilted/quilt/graphql';

import {throwIfError} from './utilities.ts';

export type GraphQLMutationOptions<Data, Variables> = Omit<
  UseMutationOptions<Data, unknown, Variables>,
  'mutationFn'
> & {
  fetch?: GraphQLFetch;
};

export function useGraphQLMutation<Data, Variables>(
  mutation: GraphQLAnyOperation<Data, Variables>,
  {
    fetch: explicitFetch,
    mutationKey,
    ...reactMutationOptions
  }: GraphQLMutationOptions<Data, Variables> = {},
): UseMutationResult<Data, unknown, Variables> {
  const fetchFromContext = useGraphQLFetch({required: false});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error(
      `No GraphQL fetch found. You either need to have access to a GraphQL fetch in context, or pass one in as the \`fetch\` option to this function.`,
    );
  }

  const fullMutationKey: unknown[] = [
    `query:${
      typeof mutation === 'string'
        ? mutation
        : 'id' in mutation
        ? mutation.id
        : toGraphQLSource(mutation)
    }`,
  ];

  if (mutationKey != null) {
    if (Array.isArray(mutationKey)) {
      fullMutationKey.push(...mutationKey);
    } else {
      fullMutationKey.push(mutationKey);
    }
  }

  return useMutation<Data, unknown, Variables>({
    mutationKey: fullMutationKey,
    mutationFn: async (variables) => {
      const result = await fetch(mutation, {
        variables: variables!,
      });

      throwIfError(result);

      return result.data!;
    },
    ...reactMutationOptions,
  });
}
