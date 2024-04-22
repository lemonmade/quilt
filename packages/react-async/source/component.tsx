import {
  Suspense,
  type ReactNode,
  type ReactElement,
  type ComponentType,
} from 'react';
import {AsyncModule, type AsyncModuleLoad} from '@quilted/async';
import {useModuleAssets} from '@quilted/react-assets';

import {useAsyncModule, useAsyncModulePreload, useHydrated} from './hooks.ts';
import type {
  NoOptions,
  RenderTiming,
  HydrationTiming,
  AssetLoadTiming,
  AsyncComponentType,
} from './types.ts';

export interface Options<
  Props extends Record<string, any> = Record<string, never>,
  PreloadOptions extends Record<string, any> = NoOptions,
> {
  name?: string;
  render?: RenderTiming;
  hydrate?: boolean | HydrationTiming;
  preload?: boolean;

  renderError?(props: Props, error: Error): ReactNode;
  renderLoading?(props: Props): ReactNode;

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
    name,
    render = 'server',
    hydrate: explicitHydrate = 'immediate',
    preload = true,
    renderLoading = noopRender,
    // renderError = defaultRenderError,
    usePreload: useCustomPreload,
  }: Options<Props, PreloadOptions> = {},
): AsyncComponentType<ComponentType<Props>, Props, PreloadOptions> {
  const hydrate = normalizeHydrate(explicitHydrate);
  const asyncModule = new AsyncModule(load);
  const componentName = name ?? displayNameFromId(asyncModule.id);

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

  const isBrowser = typeof document === 'object';
  const renderImmediately = render === 'server' || isBrowser;
  const hydrateImmediately = !isBrowser || hydrate === 'immediate';

  const getComponent = (module: (typeof asyncModule)['module']) => {
    if (!renderImmediately) return undefined;
    return module && 'default' in module ? module.default : module;
  };

  const Async = function Async(props: Props) {
    useAsyncModule(asyncModule, {
      immediate: hydrateImmediately,
      scripts: scriptTiming,
      styles: styleTiming,
    });

    // If we aren’t hydrating and we don’t have a component yet, we need to suspend,
    // so any server-rendered content can be preserved until hydration is performed.
    if (!hydrateImmediately && asyncModule.status === 'pending') {
      throw asyncModule.promise;
    }

    const Component = getComponent(asyncModule.module);

    return Component ? <Component {...props} /> : null;
  };

  // TODO handle renderError
  const AsyncWithMaybeSuspense: ComponentType<Props> = renderLoading
    ? function AsyncWithSuspense(props: Props) {
        return (
          <Suspense fallback={renderLoading(props)}>
            <Async {...props} />
          </Suspense>
        );
      }
    : Async;

  const AsyncWithMaybeClientOnlyRender: ComponentType<Props> =
    render === 'client'
      ? function AsyncWithClientOnlyRender(props: Props) {
          if (!isBrowser) {
            useModuleAssets(asyncModule.id, {
              scripts: 'preload',
              styles: 'preload',
            });

            return renderLoading?.(props) ?? null;
          }

          const hydrated = useHydrated();

          if (!hydrated) {
            return renderLoading?.(props) ?? null;
          }

          return <AsyncWithMaybeSuspense {...props} />;
        }
      : AsyncWithMaybeSuspense;

  AsyncWithMaybeClientOnlyRender.displayName = `Async(${componentName})`;

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
  > = AsyncWithMaybeClientOnlyRender as any;

  Reflect.defineProperty(FinalComponent, 'load', {
    value: () => asyncModule.import(),
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

// function defaultRenderError(_: any, error: Error) {
//   if (error) {
//     throw error;
//   }

//   return null;
// }

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
