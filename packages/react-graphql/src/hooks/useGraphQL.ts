import {useContext} from 'react';
import type {GraphQL} from '@quilted/graphql';

import {GraphQLContext} from '../context';

export function useGraphQL<Required extends boolean = true>({
  required = true as any,
}: {required?: Required} = {}): Required extends true
  ? GraphQL
  : GraphQL | undefined {
  const client = useContext(GraphQLContext);

  if (client == null && required) {
    throw new Error('No GraphQL context found');
  }

  return client!;
}
