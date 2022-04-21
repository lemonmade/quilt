import {createUseContextHook} from '@quilted/react-utilities';

import {GraphQLClientContext} from '../context';

export const useGraphQL = createUseContextHook(GraphQLClientContext);
