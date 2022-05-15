import {createUseContextHook} from '@quilted/react-utilities';

import {GraphQLFetchContext} from '../context';

export const useGraphQLFetch = createUseContextHook(GraphQLFetchContext);
