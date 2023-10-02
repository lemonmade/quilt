import {createUseContextHook} from '@quilted/react-utilities';

import {RouterContext} from '../context.ts';

export const useRouter = createUseContextHook(RouterContext);
