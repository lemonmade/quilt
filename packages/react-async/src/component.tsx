import {useEffect, useCallback, ReactNode, ComponentType} from 'react';
import {createResolver, ResolverOptions} from '@quilted/async';
import {Hydrator} from '@quilted/react-html';

import {useAsync} from './hooks';
import type {AsyncComponentType, AssetTiming} from './types';

interface Options<
  Props extends Record<string, any>,
  PreloadOptions extends Record<string, any> = Record<string, never>,
  PrefetchOptions extends Record<string, any> = Record<string, never>
> extends ResolverOptions<ComponentType<Props>> {
  defer?: 'render' | 'interactive';
  preload?: boolean;
  displayName?: string;
  renderLoading?(props: Props): ReactNode;
  renderError?(error: Error): ReactNode;

  /**
   * Custom logic to use for the usePreload hook of the new, async
   * component. Because this logic will be used as part of a generated
   * custom hook, it must follow the rules of hooks.
   */
  usePreload?(props: PreloadOptions): () => undefined | (() => void);

  /**
   * Custom logic to use for the usePrefetch hook of the new, async
   * component. Because this logic will be used as part of a generated
   * custom hook, it must follow the rules of hooks.
   */
  usePrefetch?(props: PrefetchOptions): () => undefined | (() => void);
}

export function createAsyncComponent<
  Props extends Record<string, any>,
  PreloadOptions extends Record<string, any> = Record<string, never>,
  PrefetchOptions extends Record<string, any> = Record<string, never>
>({
  id,
  load,
  defer,
  preload,
  displayName,
  renderLoading = noopRender,
  renderError = defaultRenderError,
  usePreload: useCustomPreload,
  usePrefetch: useCustomPrefetch,
}: Options<Props, PreloadOptions, PrefetchOptions>): AsyncComponentType<
  ComponentType<Props>,
  Props,
  PreloadOptions,
  PrefetchOptions
> {
  const resolver = createResolver({id, load});
  const componentName = displayName ?? displayNameFromId(resolver.id);
  const unusedAssetTiming: AssetTiming = preload ? 'soon' : 'never';
  const scriptTiming: AssetTiming =
    defer == null ? 'immediate' : unusedAssetTiming;
  const styleTiming: AssetTiming =
    defer === 'render' ? unusedAssetTiming : 'immediate';

  function Async(props: Props) {
    const {resolved: Component, load, loading, error} = useAsync(resolver, {
      scripts: scriptTiming,
      styles: styleTiming,
      immediate: defer !== 'render',
    });

    if (error) {
      return renderError(error);
    }

    let content: ReactNode | null = null;
    const rendered = Component ? <Component {...props} /> : null;

    if (loading) {
      content = renderLoading(props);
    } else {
      content =
        defer === 'interactive' ? (
          <Hydrator id={resolver.id} render={rendered != null}>
            {rendered}
          </Hydrator>
        ) : (
          rendered
        );
    }

    return (
      <>
        {content}
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
      return customPreload?.() ?? noop;
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
      return customPrefetch?.() ?? noop;
    }, [load, customPrefetch]);
  }

  function Preload(options: PreloadOptions) {
    const preload = usePreload(options);

    useEffect(() => preload(), [preload]);

    return null;
  }

  Preload.displayName = `Async.Preload(${displayName})`;

  function Prefetch(options: PrefetchOptions) {
    const prefetch = usePrefetch(options);

    useEffect(() => prefetch(), [prefetch]);

    return null;
  }

  Prefetch.displayName = `Async.Prefetch(${displayName})`;

  const FinalComponent: AsyncComponentType<
    ComponentType<Props>,
    Props,
    PreloadOptions,
    PrefetchOptions
  > = Async as any;

  Reflect.defineProperty(FinalComponent, 'load', {
    value: () => resolver.resolve(),
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

  Reflect.defineProperty(FinalComponent, 'usePreload', {
    value: usePreload,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'usePrefetch', {
    value: usePrefetch,
    writable: false,
  });

  return FinalComponent;
}

function noop() {}

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
