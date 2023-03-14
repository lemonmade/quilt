import {
  useEffect,
  Suspense,
  type ReactNode,
  type ReactElement,
  type ComponentType,
} from 'react';
import {
  createAsyncModule,
  type AsyncModuleLoad,
  type AsyncModule,
} from '@quilted/async';

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
  name?: string;
  render?: RenderTiming;
  hydrate?: boolean | HydrationTiming;
  preload?: boolean;
  suspense?: boolean;

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
    suspense = true,
    renderLoading = noopRender,
    renderError = defaultRenderError,
    usePreload: useCustomPreload,
  }: Options<Props, PreloadOptions> = {},
): AsyncComponentType<ComponentType<Props>, Props, PreloadOptions> {
  const hydrate = normalizeHydrate(explicitHydrate);
  const asyncModule = createAsyncModule(load);
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
  const hydrateImmediately = renderImmediately && hydrate === 'immediate';

  const getComponent = (module: (typeof asyncModule)['loaded']) => {
    if (!renderImmediately) return undefined;
    return module && 'default' in module ? module.default : module;
  };

  const Async: any = suspense
    ? function Async(props: Props) {
        if (hydrateImmediately || (renderImmediately && !isBrowser)) {
          asyncModule.load();
        }

        const module = useAsyncModule(asyncModule, {
          suspense: true,
          immediate: renderImmediately,
          scripts: scriptTiming,
          styles: styleTiming,
        });

        const Component = getComponent(module);

        return Component ? <Component {...props} /> : null;
      }
    : function Async(props: Props) {
        const {
          resolved: module,
          load,
          error,
        } = useAsyncModule(asyncModule, {
          suspense: false,
          immediate: renderImmediately,
          scripts: scriptTiming,
          styles: styleTiming,
        });

        if (error) {
          return renderError?.(props, error) ?? null;
        }

        const Component = getComponent(module);

        return Component ? (
          <Component {...props} />
        ) : (
          <>
            {renderLoading?.(props) ?? null}
            {hydrateImmediately && <DoLoad load={load} />}
          </>
        );
      };

  const AsyncWithWrappers: any =
    suspense && renderLoading
      ? function AsyncWithWrappers(props: Props) {
          const clientRenderOnly = render === 'client';

          // TODO handle renderError
          return clientRenderOnly ? (
            <>
              <div>
                <Suspense>
                  <Async {...props} />
                </Suspense>
              </div>
              <RenderWhileLoading
                module={asyncModule}
                render={() => renderLoading(props)}
              />
            </>
          ) : (
            <Suspense fallback={renderLoading(props)}>
              <Async {...props} />
            </Suspense>
          );
        }
      : Async;

  AsyncWithWrappers.displayName = `Async(${componentName})`;

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
  > = AsyncWithWrappers;

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

function DoLoad({load}: {load: () => Promise<any>}) {
  useEffect(() => {
    load();
  }, [load]);

  return null;
}

function RenderWhileLoading({
  module,
  render,
}: {
  module: AsyncModule<any>;
  render: () => ReactNode;
}) {
  if (typeof document === 'undefined' && module.loaded != null) {
    return null;
  }

  const {
    resolved,
    // eslint-disable-next-line react-hooks/rules-of-hooks
  } = useAsyncModule(module, {
    suspense: false,
    immediate: false,
    scripts: 'never',
    styles: 'never',
  });

  return resolved ? null : (render() as any) ?? null;
}

function noopRender() {
  return null;
}

function defaultRenderError(_: any, error: Error) {
  if (error) {
    throw error;
  }

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
