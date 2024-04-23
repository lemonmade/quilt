import {Component, Suspense, type ReactNode, type ComponentType} from 'react';
import {AsyncModule} from '@quilted/async';
import type {AssetLoadTiming} from '@quilted/react-assets';

import {useHydrated} from './hooks/hydration.ts';
import {useAsyncModuleAssets} from './hooks/module.ts';

export interface AsyncComponentProps<Props> {
  module: AsyncModule<{default: ComponentType<Props>}>;
  props?: Props;
  server?: boolean;
  client?: boolean | 'render' | 'defer';
  preload?: boolean;
  renderLoading?: ReactNode | ((props: Props) => ReactNode);
}

export class AsyncComponent<Props> extends Component<
  AsyncComponentProps<Props>
> {
  static from<Props>(
    moduleOrImport:
      | AsyncModule<{default: ComponentType<Props>}>
      | (() => Promise<{default: ComponentType<Props>}>),
    {
      name,
      ...options
    }: Pick<
      AsyncComponentProps<Props>,
      'server' | 'client' | 'preload' | 'renderLoading'
    > & {name?: string} = {},
  ): ComponentType<Props> & {
    readonly module: AsyncModule<{default: ComponentType<Props>}>;
    load(): Promise<ComponentType<Props>>;
  } {
    const module =
      typeof moduleOrImport === 'function'
        ? new AsyncModule(moduleOrImport)
        : moduleOrImport;

    function AsyncComponentInternal(props: Props) {
      return <AsyncComponent {...options} module={module} props={props} />;
    }

    Object.assign(AsyncComponentInternal, {
      module,
      displayName: `Async(${name ?? displayNameFromId(module.id)})`,
      load: () => module.load().then((resolved) => resolved.default),
    });

    return AsyncComponentInternal as any;
  }

  render() {
    const {
      module,
      props,
      server = true,
      client = true,
      preload = client !== false,
      renderLoading,
    } = this.props;

    const isBrowser = typeof document === 'object';

    const hydrate =
      client === true || client === 'render' ? 'immediate' : 'defer';
    const hydrateImmediately = !isBrowser || hydrate === 'immediate';

    if (typeof document === 'object') {
      let scriptTiming: AssetLoadTiming;
      let styleTiming: AssetLoadTiming;

      if (server) {
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

      useAsyncModuleAssets(module, {
        scripts: scriptTiming,
        styles: styleTiming,
      });
    }

    // If we aren’t hydrating and we don’t have a component yet, we need to suspend,
    // so any server-rendered content can be preserved until hydration is performed.
    if (!hydrateImmediately && module.status === 'pending') {
      throw module.promise;
    }

    if (module.error) {
      throw module.error;
    }

    const hydrated = useHydrated();

    if (!server) {
      if (!isBrowser) {
        return normalizeRender(renderLoading, props);
      }

      if (!hydrated) {
        return normalizeRender(renderLoading, props);
      }
    }

    const Component = module.module?.default;

    if (Component == null) return null;

    return renderLoading ? (
      <Suspense fallback={normalizeRender(renderLoading, props)}>
        <Component {...props!} />
      </Suspense>
    ) : (
      <Component {...props!} />
    );
  }
}

function normalizeRender<Props>(
  render?: ReactNode | ((props: Props) => ReactNode),
  props: Props = {} as any,
) {
  return typeof render === 'function' ? render(props) : render ?? null;
}

function displayNameFromId(id?: string) {
  if (!id) {
    return 'Component';
  }

  return id.split('_')[0];
}
