import React, {useEffect, useCallback, ReactNode, ComponentType} from 'react';
import {createResolver, ResolverOptions} from '@quilted/async';

import {useAsync} from './hooks';
import {AsyncComponentType} from './types';

interface Options<
  Props extends object,
  PreloadOptions extends object = {},
  PrefetchOptions extends object = {},
  KeepFreshOptions extends object = {}
> extends ResolverOptions<ComponentType<Props>> {
  displayName?: string;
  renderLoading?(props: Props): ReactNode;
  renderError?(error: Error): ReactNode;

  /**
   * Custom logic to use for the usePreload hook of the new, async
   * component. Because this logic will be used as part of a generated
   * custom hook, it must follow the rules of hooks.
   */
  usePreload?(props: PreloadOptions): () => void;

  /**
   * Custom logic to use for the usePrefetch hook of the new, async
   * component. Because this logic will be used as part of a generated
   * custom hook, it must follow the rules of hooks.
   */
  usePrefetch?(props: PrefetchOptions): () => void;

  /**
   * Custom logic to use for the useKeepFresh hook of the new, async
   * component. Because this logic will be used as part of a generated
   * custom hook, it must follow the rules of hooks.
   */
  useKeepFresh?(props: KeepFreshOptions): () => void;
}

export function createAsyncComponent<
  Props extends object,
  PreloadOptions extends object = {},
  PrefetchOptions extends object = {},
  KeepFreshOptions extends object = {}
>({
  id,
  load,
  displayName,
  renderLoading = noopRender,
  renderError = defaultRenderError,
  usePreload: useCustomPreload,
  usePrefetch: useCustomPrefetch,
  useKeepFresh: useCustomKeepFresh,
}: Options<
  Props,
  PreloadOptions,
  PrefetchOptions,
  KeepFreshOptions
>): AsyncComponentType<
  ComponentType<Props>,
  Props,
  PreloadOptions,
  PrefetchOptions,
  KeepFreshOptions
> {
  const resolver = createResolver({id, load});
  const componentName = displayName ?? displayNameFromId(resolver.id);

  function Async(props: Props) {
    const {resolved: Component, load, loading, error} = useAsync(resolver, {
      scripts: 'immediate',
      styles: 'immediate',
      immediate: true,
    });

    if (error) {
      return renderError(error);
    }

    let contentMarkup: ReactNode | null = null;
    const rendered = Component ? <Component {...props} /> : null;

    if (loading) {
      contentMarkup = renderLoading(props);
    } else {
      contentMarkup = rendered;
    }

    return (
      <>
        {contentMarkup}
        {loading && <Loader load={load} />}
      </>
    );
  }

  Async.displayName = `Async(${componentName})`;

  function usePreload(props: PreloadOptions) {
    const {load} = useAsync(resolver, {
      styles: 'eventually',
      scripts: 'eventually',
    });

    const customPreload = useCustomPreload?.(props);

    return useCallback(() => {
      load();
      customPreload?.();
    }, [load, customPreload]);
  }

  function usePrefetch(props: PrefetchOptions) {
    const {load} = useAsync(resolver, {
      styles: 'soon',
      scripts: 'soon',
    });

    const customPrefetch = useCustomPrefetch?.(props);

    return useCallback(() => {
      load();

      if (customPrefetch) {
        customPrefetch();
      }
    }, [load, customPrefetch]);
  }

  function useKeepFresh(props: KeepFreshOptions) {
    const {load} = useAsync(resolver, {
      styles: 'eventually',
      scripts: 'eventually',
    });

    const customKeepFresh = useCustomKeepFresh?.(props);

    return useCallback(() => {
      load();
      customKeepFresh?.();
    }, [load, customKeepFresh]);
  }

  function Preload(options: PreloadOptions) {
    const preload = usePreload(options);

    useEffect(() => {
      preload();
    }, [preload]);

    return null;
  }

  Preload.displayName = `Async.Preload(${displayName})`;

  function Prefetch(options: PrefetchOptions) {
    const prefetch = usePrefetch(options);

    useEffect(() => {
      prefetch();
    }, [prefetch]);

    return null;
  }

  Prefetch.displayName = `Async.Prefetch(${displayName})`;

  function KeepFresh(options: KeepFreshOptions) {
    const keepFresh = useKeepFresh(options);

    useEffect(() => {
      keepFresh();
    }, [keepFresh]);

    return null;
  }

  KeepFresh.displayName = `Async.KeepFresh(${displayName})`;

  const FinalComponent: AsyncComponentType<
    ComponentType<Props>,
    Props,
    PreloadOptions,
    PrefetchOptions,
    KeepFreshOptions
  > = Async as any;

  Reflect.defineProperty(FinalComponent, 'resolver', {
    value: resolver,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'Preload', {
    value: Preload,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'Prefetch', {
    value: Prefetch,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'KeepFresh', {
    value: KeepFresh,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'usePreload', {
    value: usePreload,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'usePrefetch', {
    value: usePrefetch,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'useKeepFresh', {
    value: useKeepFresh,
    writable: false,
  });

  return FinalComponent;
}

function noopRender() {
  return null;
}

const DEFAULT_DISPLAY_NAME = 'Component';
const FILENAME_REGEX = /([^/]*)\.\w+$/;

function displayNameFromId(id?: string) {
  if (!id) {
    return DEFAULT_DISPLAY_NAME;
  }

  const match = FILENAME_REGEX.exec(id);
  return match?.[1] ?? DEFAULT_DISPLAY_NAME;
}

function defaultRenderError(error: Error) {
  if (error) {
    throw error;
  }

  return null;
}

function Loader({load}: {load(): void}) {
  useEffect(() => {
    load();
  }, [load]);

  return null;
}
