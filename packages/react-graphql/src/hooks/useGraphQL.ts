import {useContext} from 'react';

import {GraphQLContext} from '../context';

export function useGraphQL() {
  const client = useContext(GraphQLContext);

  if (client == null) {
    throw new Error('No GraphQL context found');
  }

  return client;
}
