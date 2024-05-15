import type {AsyncFetchCache} from '@quilted/async';
import type {ReadonlySignal} from '@quilted/preact-signals';
import {createOptionalContext} from '@quilted/preact-context';

export const AsyncHydratedContext =
  createOptionalContext<ReadonlySignal<boolean>>();
export const AsyncFetchCacheContext = createOptionalContext<AsyncFetchCache>();
