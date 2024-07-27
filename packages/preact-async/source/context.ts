import type {AsyncActionCache} from '@quilted/async';
import type {ReadonlySignal} from '@quilted/preact-signals';
import {createOptionalContext} from '@quilted/preact-context';

import type {AsyncComponentProps} from './AsyncComponent.tsx';

export const AsyncComponentContext =
  createOptionalContext<Pick<AsyncComponentProps<any>, 'render'>>();

export const AsyncHydratedContext =
  createOptionalContext<ReadonlySignal<boolean>>();

export const AsyncActionCacheContext =
  createOptionalContext<AsyncActionCache>();

export const useAsyncActionCache = AsyncActionCacheContext.use;
