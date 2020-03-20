import {useState, useCallback, useContext, useEffect, useRef} from 'react';
import {Resolver} from '@quilted/async';
import {useServerEffect} from '@quilted/react-server-render';

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
  const [value, setValue] = useState<T | Error | undefined>(() =>
    immediate || typeof window !== 'undefined' ? resolver.resolved : undefined,
  );

  const mounted = useMountedRef();

  const load = useCallback(async (): Promise<T | Error> => {
    if (value != null) {
      return value;
    }

    try {
      const resolved = await resolver.resolve();

      if (mounted.current) {
        // It's important to use the function form of setValue here.
        // Resolved is going to be a function in most cases, since it's
        // a React component. If you do not set it using the function form,
        // React treats the component as the function that returns state,
        // so it sets state with the result of manually calling the component
        // (so, usually JSX).
        setValue(() => resolved);
      }

      return resolved;
    } catch (error) {
      if (mounted.current) {
        setValue(error);
      }

      return error;
    }
  }, [mounted, resolver, value]);

  const {id} = resolver;

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

function useMountedRef() {
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}
