import {createUseContextHook} from '@quilted/react-utilities';

import {GraphQLFetchContext} from '../context.tsx';

export const useGraphQLFetch = createUseContextHook(GraphQLFetchContext);
