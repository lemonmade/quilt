/* eslint react-hooks/rules-of-hooks: off */

import {useEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {useModuleAssets} from '@quilted/react-assets';
import type {AsyncModule} from '@quilted/async';

import type {AssetLoadTiming} from '../types';

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
  const ref = useRef<{
    promise?: Promise<void>;
    error?: Error;
  }>({});

  const isServer = typeof document !== 'object';

  const value = isServer
    ? asyncModule.loaded
    : useSyncExternalStore(
        ...useMemo<Parameters<typeof useSyncExternalStore<Module | undefined>>>(
          () => [
            (callback) => {
              const abort = new AbortController();
              asyncModule.on(
                'resolve',
                (resolved) => {
                  ref.current.error =
                    resolved instanceof Error ? resolved : undefined;
                  callback();
                },
                {signal: abort.signal},
              );
              return () => abort.abort();
            },
            () => asyncModule.loaded,
          ],
          [asyncModule],
        ),
      );

  if (suspense) {
    if (ref.current.error != null) throw ref.current.error;

    if (value == null && immediate) {
      ref.current.promise ??= asyncModule
        .on('resolve', {once: true})
        .then(() => {
          ref.current.promise = undefined;
        });

      throw ref.current.promise;
    }
  }

  if (isServer) {
    useModuleAssets(asyncModule.loaded && immediate ? id : undefined, {
      styles,
      scripts,
    });
  }

  if (suspense) {
    return value;
  }

  return {
    id,
    resolved: value,
    error: ref.current.error,
    load,
  };
}

export function useAsyncModulePreload<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
) {
  useModuleAssets(asyncModule.id, {scripts: 'preload', styles: 'preload'});

  useEffect(() => {
    asyncModule.load().catch(() => {
      // Do nothing
    });
  }, [asyncModule]);
}
