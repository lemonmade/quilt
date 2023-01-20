import {
  useEffect,
  type ReactNode,
  type ReactElement,
  type ComponentType,
} from 'react';
import {createAsyncModule, AsyncModuleLoad} from '@quilted/async';
import {Hydrator} from '@quilted/react-html';

import {useAsyncModule, useAsyncModulePreload} from './hooks';
import type {
  NoOptions,
  RenderTiming,
  HydrationTiming,
  AssetLoadTiming,
  AsyncComponentType,
} from './types';

export interface Options<
  Props extends Record<string, any> = Record<string, never>,
  PreloadOptions extends Record<string, any> = NoOptions,
> {
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
  usePreload?(props: PreloadOptions): void;
}

export function createAsyncComponent<
  Props extends Record<string, any> = Record<string, never>,
  PreloadOptions extends Record<string, any> = NoOptions,
>(
  load: AsyncModuleLoad<
    | ComponentType<Props>
    | (() => ReactElement<any, any>)
    | {default: ComponentType<Props>}
  >,
  {
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
  const asyncModule = createAsyncModule(load);
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
      immediate: typeof window !== 'undefined' || render === 'server',
    });

    if (error) {
      return renderError(error);
    }

    const Component = (resolved as any)?.default ?? resolved;
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
    useAsyncModulePreload(asyncModule);
    useCustomPreload?.(props);
  }

  function Preload(options: PreloadOptions) {
    usePreload(options);
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
