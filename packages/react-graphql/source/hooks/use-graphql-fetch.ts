import {createUseContextHook} from '@quilted/react-utilities';

import {GraphQLRunContext} from '../context.tsx';

export const useGraphQLRun = createUseContextHook(GraphQLRunContext);
export {useGraphQLRun as useGraphQLFetch};
