import {createUseContextHook} from '@quilted/react-utilities';

import {InitialUrlContext} from '../context.ts';

export const useInitialUrl = createUseContextHook(InitialUrlContext);
