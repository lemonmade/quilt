import {useEffect, useCallback, ReactNode, ComponentType} from 'react';
import {
  createAsyncModule,
  AsyncModuleLoad,
  AsyncModuleOptions,
} from '@quilted/async';
import {Hydrator} from '@quilted/react-html';

import {useAsyncModule} from './hooks';
import type {
  NoOptions,
  RenderTiming,
  HydrationTiming,
  AssetLoadTiming,
  AsyncComponentType,
} from './types';

export interface Options<
  Props extends Record<string, any>,
  PreloadOptions extends Record<string, any> = NoOptions,
> extends AsyncModuleOptions {
  render?: RenderTiming;
  hydrate?: boolean | HydrationTiming;
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
}

export function createAsyncComponent<
  Props extends Record<string, any>,
  PreloadOptions extends Record<string, any> = NoOptions,
>(
  load: AsyncModuleLoad<{default: ComponentType<Props>}>,
  {
    id,
    render = 'server',
    hydrate: explicitHydrate = 'immediate',
    preload = true,
    displayName,
    renderLoading = noopRender,
    renderError = defaultRenderError,
    usePreload: useCustomPreload,
  }: Options<Props, PreloadOptions> = {},
): AsyncComponentType<ComponentType<Props>, Props, PreloadOptions> {
  const hydrate = normalizeHydrate(explicitHydrate);
  const asyncModule = createAsyncModule(load, {id});
  const componentName = displayName ?? displayNameFromId(asyncModule.id);

  let scriptTiming: AssetLoadTiming;
  let styleTiming: AssetLoadTiming;

  if (render === 'server') {
    // If we are server rendering, we always have to load the styles for an
    // async component synchronously.
    styleTiming = 'load';

    if (hydrate === 'immediate') {
      // If we are going to hydrate immediately, we need the assets immediately,
      // too.
      scriptTiming = 'load';
    } else if (preload) {
      // If we are going to hydrate later, and the consumer wants to preload,
      // we will preload the scripts for later.
      scriptTiming = 'preload';
    } else {
      // We don’t need the scripts right away, and the consumer doesn’t want
      // to preload, so we just won’t load the scripts at all — the client can
      // do that if it wants later on!
      scriptTiming = 'never';
    }
  } else if (preload) {
    // We aren’t server rendering, but the consumer wants to preload the assets
    // for the component.
    styleTiming = 'preload';
    scriptTiming = 'preload';
  } else {
    // Not server rendering, and not preloading... We’ll leave it up to the client!
    styleTiming = 'never';
    scriptTiming = 'never';
  }

  function Async(props: Props) {
    const {resolved, load, loading, error} = useAsyncModule(asyncModule, {
      scripts: scriptTiming,
      styles: styleTiming,
      immediate: render === 'server',
    });

    if (error) {
      return renderError(error);
    }

    const Component = resolved?.default;
    const rendered = Component ? <Component {...props} /> : null;

    let content: ReactNode = null;

    if (loading) {
      content = renderLoading(props);
    } else {
      content =
        hydrate === 'defer' ? (
          <Hydrator id={asyncModule.id} render={rendered != null}>
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
    const {load} = useAsyncModule(asyncModule, {
      styles: 'preload',
      scripts: 'preload',
    });

    const customPreload = useCustomPreload?.(props);

    return useCallback(() => {
      load();
      return customPreload?.() ?? noop;
    }, [load, customPreload]);
  }

  function Preload(options: PreloadOptions) {
    const preload = usePreload(options);

    useEffect(() => preload(), [preload]);

    return null;
  }

  Preload.displayName = `Async.Preload(${componentName})`;

  const FinalComponent: AsyncComponentType<
    ComponentType<Props>,
    Props,
    PreloadOptions
  > = Async as any;

  Reflect.defineProperty(FinalComponent, 'load', {
    value: () => asyncModule.load(),
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'module', {
    value: asyncModule,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'Preload', {
    value: Preload,
    writable: false,
  });

  Reflect.defineProperty(FinalComponent, 'usePreload', {
    value: usePreload,
    writable: false,
  });

  return FinalComponent;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

function noopRender() {
  return null;
}

function normalizeHydrate(hydrate: boolean | HydrationTiming): HydrationTiming {
  switch (hydrate) {
    case true:
      return 'immediate';
    case false:
      return 'defer';
    default:
      return hydrate;
  }
}

const DEFAULT_DISPLAY_NAME = 'Component';

function displayNameFromId(id?: string) {
  if (!id) {
    return DEFAULT_DISPLAY_NAME;
  }

  return id.split('_')[0];
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
