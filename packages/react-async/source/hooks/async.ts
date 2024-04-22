import {useEffect, useMemo} from 'react';
import {useModuleAssets} from '@quilted/react-assets';
import {AsyncAction, type AsyncModule} from '@quilted/async';
// Imported for the side effects
import {} from '@quilted/react-signals';

import type {AssetLoadTiming} from '../types.ts';

export function useAsync<T>(
  run: () => PromiseLike<T>,
  {
    initial,
    signal,
    active = true,
  }: {initial?: T; active?: boolean; signal?: AbortSignal} = {},
) {
  const action = useMemo(() => new AsyncAction(run, {initial}), []);

  if (active && action.status === 'pending' && !signal?.aborted) {
    throw action.run({signal});
  }

  return action;
}

export interface Options {
  immediate?: boolean;
  styles?: AssetLoadTiming;
  scripts?: AssetLoadTiming;
}

export function useAsyncModule<Module>(
  asyncModule: AsyncModule<Module>,
  {scripts, styles, immediate = true}: Options = {},
): AsyncModule<Module> {
  if (immediate) {
    throw asyncModule.import();
  }

  if (typeof document !== 'object') {
    useModuleAssets(asyncModule.id, {styles, scripts});
  }

  return asyncModule;
}

export function useAsyncModulePreload<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
) {
  useModuleAssets(asyncModule.id, {scripts: 'preload', styles: 'preload'});

  useEffect(() => {
    asyncModule.import();
  }, [asyncModule]);
}
