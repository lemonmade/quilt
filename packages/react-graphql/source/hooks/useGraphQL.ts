import {createUseContextHook} from '@quilted/react-utilities';

import {GraphQLContext} from '../context';

export const useGraphQL = createUseContextHook(GraphQLContext);
