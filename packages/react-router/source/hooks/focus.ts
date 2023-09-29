import {createUseContextHook} from '@quilted/react-utilities';

import {FocusContext} from '../context.ts';

export const useRouteChangeFocusRef = createUseContextHook(FocusContext);
