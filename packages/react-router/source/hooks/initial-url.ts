import {createUseContextHook} from '@quilted/react-utilities';

import {InitialURLContext} from '../context.ts';

export const useInitialURL = createUseContextHook(InitialURLContext);
