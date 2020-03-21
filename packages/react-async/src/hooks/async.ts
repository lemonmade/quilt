import {useCallback, useContext, useMemo} from 'react';
import {Resolver} from '@quilted/async';
import {useServerEffect} from '@quilted/react-server-render';
import {useSubscription, Subscription} from 'use-subscription';

import {AsyncAssetContext} from '../context';
import {AssetTiming} from '../types';

interface Options {
  immediate?: boolean;
  styles?: AssetTiming;
  scripts?: AssetTiming;
}

export function useAsync<T>(
  resolver: Resolver<T>,
  {scripts, styles, immediate = true}: Options = {},
) {
  const {id} = resolver;
  const load = useCallback(() => resolver.resolve(), [resolver]);

  const value = useSubscription(
    useMemo((): Subscription<T | undefined> => {
      return {
        getCurrentValue() {
          return typeof window !== 'undefined' || immediate
            ? resolver.resolved
            : undefined;
        },
        subscribe(callback) {
          return resolver.subscribe(callback);
        },
      };
    }, [immediate, resolver]),
  );

  useAsyncAsset(id, {scripts, styles});

  return value instanceof Error
    ? {id, resolved: null, error: value, loading: false, load}
    : {
        id,
        resolved: value,
        error: null,
        loading: value == null,
        load,
      };
}

export function useAsyncAsset(
  id?: string,
  {scripts, styles}: {styles?: AssetTiming; scripts?: AssetTiming} = {},
) {
  const async = useContext(AsyncAssetContext);

  useServerEffect(
    () => {
      if (async && id) {
        async.markAsUsed(id, {scripts, styles});
      }
    },
    async ? async.effect : undefined,
  );
}
