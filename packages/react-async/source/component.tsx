import {
  Component,
  createRef,
  type ReactNode,
  type ReactElement,
  type ComponentType,
  type PropsWithChildren,
} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {createAsyncModule, AsyncModuleLoad} from '@quilted/async';

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

const EMPTY_OBJECT = {};

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

  function ServerAsync(props: Props) {
    const {resolved, loading, error} = useAsyncModule(asyncModule, {
      scripts: scriptTiming,
      styles: styleTiming,
      immediate: typeof document !== 'undefined' || render === 'server',
    });

    const Component = (resolved as any)?.default ?? resolved;

    // TODO error state will not persist to client rendering...
    if (error) {
      return <>{renderError(error)}</>;
    }

    return loading ? (
      <>{renderLoading(props)}</>
    ) : (
      <div>{Component ? <Component {...props} /> : null}</div>
    );
  }

  class Async extends Component<Props> {
    static displayName = `Async(${componentName})`;

    private root = createRef<HTMLElement | null>();
    private mounted = false;
    private hydrated = false;

    shouldComponentUpdate(nextProps: Props) {
      if (this.hydrated) {
        this.handleLoad(asyncModule.loaded!, nextProps);
      }

      return false;
    }

    componentWillUnmount() {
      this.mounted = false;

      if ((this.root.current?.children.length ?? 0) > 0) {
        createRoot(this.root.current!).unmount();
      }
    }

    componentDidMount() {
      this.mounted = true;
      const resolved = asyncModule.loaded;

      if (resolved) {
        this.handleLoad(resolved);
      } else {
        asyncModule.load().then((loaded) => {
          this.handleLoad(loaded);
        });
      }
    }

    render() {
      if (typeof document === 'undefined') {
        return <ServerAsync {...this.props} />;
      }

      return (
        <div
          ref={this.root as any}
          // suppressHydrationWarning
          dangerouslySetInnerHTML={EMPTY_OBJECT as any}
        />
      );
    }

    private handleLoad(
      loaded: NonNullable<typeof asyncModule['loaded']>,
      props = this.props,
    ) {
      if (this.root.current == null || !this.mounted) return;

      const Component = (loaded as any)?.default ?? loaded;

      // hydrate on first run, then normal renders thereafter
      if (!this.hydrated && this.root.current.children.length > 0) {
        hydrateRoot(
          this.root.current,
          <ContextProvider context={this.context}>
            <Component {...props} />
          </ContextProvider>,
        );
      } else {
        createRoot(this.root.current).render(
          <ContextProvider context={this.context}>
            <Component {...props} />
          </ContextProvider>,
        );
      }

      this.hydrated = true;
    }
  }

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

class ContextProvider extends Component<PropsWithChildren<{context: any}>> {
  getChildContext() {
    return this.props.context;
  }

  render() {
    return this.props.children;
  }
}
