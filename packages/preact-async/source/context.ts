import {createOptionalContext} from '@quilted/preact-context';
import type {Signal} from '@quilted/preact-signals';

export const AsyncHydratedContext = createOptionalContext<Signal<boolean>>();
