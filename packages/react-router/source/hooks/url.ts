import {createUseContextHook} from '@quilted/react-utilities';

import {CurrentUrlContext} from '../context.ts';

export const useCurrentUrl = createUseContextHook(CurrentUrlContext);
