import type {AsyncActionCache} from '@quilted/async';
import type {ReadonlySignal} from '@quilted/preact-signals';
import {createOptionalContext} from '@quilted/preact-context';

export const AsyncHydratedContext =
  createOptionalContext<ReadonlySignal<boolean>>();

export const AsyncActionCacheContext =
  createOptionalContext<AsyncActionCache>();

export const useAsyncActionCache = AsyncActionCacheContext.use;
