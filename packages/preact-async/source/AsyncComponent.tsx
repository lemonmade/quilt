import {Component, type ComponentChildren, type ComponentType} from 'preact';
import {Suspense} from 'preact/compat';
import {useEffect} from 'preact/hooks';

import {AsyncModule, type AsyncModuleLoader} from '@quilted/async';
import type {AssetLoadTiming} from '@quilted/preact-browser/server';

import {useHydrated} from './hooks/hydration.ts';
import {useAsyncModuleAssets} from './hooks/module.ts';
import {AsyncComponentContext} from './context.ts';

export interface AsyncComponentProps<Props> {
  module: AsyncModule<{default: ComponentType<Props>}>;
  props?: Props;
  server?: boolean;
  client?: boolean | 'render' | 'defer';
  preload?: boolean;
  render?: (
    element: ComponentChildren,
    props: AsyncComponentProps<Props>,
  ) => ComponentChildren;
  renderLoading?: ComponentChildren | ((props: Props) => ComponentChildren);
}

export type AsyncComponentType<Props> = ComponentType<Props> & {
  readonly module: AsyncModule<{default: ComponentType<Props>}>;
  readonly Preload: ComponentType<{}>;
  load(): Promise<ComponentType<Props>>;
};

export class AsyncComponent<Props> extends Component<
  AsyncComponentProps<Props>
> {
  static from<Props>(
    moduleOrImport:
      | AsyncModule<{default: ComponentType<Props>}>
      | AsyncModuleLoader<{default: ComponentType<Props>}>,
    {
      name,
      ...options
    }: Pick<
      AsyncComponentProps<Props>,
      'server' | 'client' | 'preload' | 'render' | 'renderLoading'
    > & {name?: string} = {},
  ): AsyncComponentType<Props> {
    const module =
      moduleOrImport instanceof AsyncModule
        ? moduleOrImport
        : new AsyncModule(moduleOrImport);

    function AsyncComponentInternal(props: Props) {
      const asyncComponentContext = AsyncComponentContext.use({optional: true});
      const render = options.render ?? asyncComponentContext?.render;

      return (
        <AsyncComponent
          {...options}
          render={render}
          module={module}
          props={props}
        />
      );
    }

    Object.assign(AsyncComponentInternal, {
      module,
      displayName: `Async(${name ?? displayNameFromId(module.id)})`,
      load: () => module.load().then((resolved) => resolved.default),
      Preload: function Preload() {
        useAsyncModuleAssets(module, {scripts: 'preload', styles: 'preload'});
        useEffect(() => {
          module.load().catch(() => {});
        });
      },
    });

    return AsyncComponentInternal as any;
  }

  static useAssets(props: AsyncComponentProps<any>) {
    if (typeof document === 'object') return;

    const {
      module,
      server = true,
      client = true,
      preload = client !== false,
    } = props;

    const hydrate =
      client === true || client === 'render' ? 'immediate' : 'defer';

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

  private Component = function Component({
    module,
    props,
    client,
    renderLoading,
  }: AsyncComponentProps<Props>) {
    // If we aren’t hydrating and we don’t have a component yet, we need to suspend,
    // so any server-rendered content can be preserved until hydration is performed.
    if (
      typeof document === 'object' &&
      (client === false || client === 'defer') &&
      module.status === 'pending'
    ) {
      throw module.promise;
    }

    const Component = module.module?.default;

    if (Component == null) {
      throw module.load();
    }

    return hasLoadingContent(renderLoading) ? (
      <Suspense fallback={normalizeRender(renderLoading, props)}>
        <Component {...props!} />
      </Suspense>
    ) : (
      <Component {...props!} />
    );
  };

  render() {
    const {
      module,
      props,
      server = true,
      client = true,
      render = defaultRender,
      renderLoading,
    } = this.props;

    if (module.error) {
      throw module.error;
    }

    const {Component} = this;

    const isBrowser = typeof document === 'object';

    const hydrated = useHydrated();

    let content: ComponentChildren = null;

    if (!server && (!isBrowser || !hydrated)) {
      content = normalizeRender(renderLoading, props);
    } else if (client !== false || !isBrowser) {
      content = hasLoadingContent(renderLoading) ? (
        <Suspense fallback={normalizeRender(renderLoading, props)}>
          <Component {...this.props} />
        </Suspense>
      ) : (
        <Component {...this.props} />
      );
    }

    return render(content, this.props);
  }
}

function defaultRender(
  content: ComponentChildren,
  props: AsyncComponentProps<any>,
) {
  if (typeof document !== 'object') AsyncComponent.useAssets(props);
  return content;
}

function hasLoadingContent(
  content?: ComponentChildren | ((...args: any) => ComponentChildren),
) {
  // `null` should be treated as empty loading content
  return content !== undefined;
}

function normalizeRender<Props>(
  render?: ComponentChildren | ((props: Props) => ComponentChildren),
  props: Props = {} as any,
): ComponentChildren {
  return typeof render === 'function' ? render(props) : render ?? null;
}

function displayNameFromId(id?: string) {
  if (!id) {
    return 'Component';
  }

  return id.split('_')[0];
}
