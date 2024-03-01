import {useEffect} from 'react';
import {useModuleAssets} from '@quilted/react-assets';
import {useServerAction} from '@quilted/react-server-render';
import type {AsyncModule} from '@quilted/async';

import type {AssetLoadTiming} from '../types.ts';

export interface Options {
  immediate?: boolean;
  suspense?: boolean;
  styles?: AssetLoadTiming;
  scripts?: AssetLoadTiming;
}

export interface AsyncModuleResult<Module = Record<string, unknown>> {
  id?: string;
  resolved?: Module;
  error?: Error;
  load(): Promise<Module>;
}

export function useAsyncModule<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
  options: Options & {suspense: true; immediate?: true},
): Module;
export function useAsyncModule<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
  options: Options & {suspense: true; immediate: boolean},
): Module | undefined;
export function useAsyncModule<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
  options: Options & {suspense?: false},
): AsyncModuleResult<Module>;
export function useAsyncModule<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
  {scripts, styles, suspense = false, immediate = true}: Options = {},
): Module | AsyncModuleResult<Module> | undefined {
  const {id, load} = asyncModule;

  const isServer = typeof document !== 'object';

  const module = asyncModule.module;

  if (suspense && module == null && immediate) {
    throw asyncModule.load();
  }

  if (isServer) {
    useModuleAssets(id, {styles, scripts});

    useServerAction(() => {
      if (module == null && immediate) return asyncModule.load();
    });
  }

  if (suspense) {
    return module;
  }

  return {
    id,
    resolved: module,
    get error() {
      return asyncModule.cause as Error;
    },
    load,
  };
}

export function useAsyncModulePreload<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
) {
  useModuleAssets(asyncModule.id, {scripts: 'preload', styles: 'preload'});

  useEffect(() => {
    asyncModule.load();
  }, [asyncModule]);
}
