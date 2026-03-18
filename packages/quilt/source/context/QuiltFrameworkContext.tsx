import {useLayoutEffect, useMemo, useContext} from 'preact/hooks';
import type {ComponentChildren} from 'preact';

import {
  QuiltFrameworkContextPreact,
  type QuiltContext,
} from '@quilted/preact-context';
import {HTMLAttributes} from '@quilted/preact-browser';
import {signal} from '@quilted/preact-signals';

import type {Navigation, RouteNavigationEntry} from '@quilted/preact-router';
import type {Localization} from '@quilted/preact-localize';
import type {BrowserDetails} from '@quilted/preact-browser';
import type {BrowserAssets} from '@quilted/assets';
import type {Performance} from '@quilted/preact-performance';
import type {AsyncActionCache} from '@quilted/async';
import type {AsyncComponentProps, AsyncContext} from '@quilted/preact-async';
import {useAsyncActionCacheSerialization} from '@quilted/preact-async';
import type {GraphQLClient} from '@quilted/graphql';

/**
 * The allowlisted set of `QuiltContext` fields that can be passed as props
 * to the `<QuiltFrameworkContext>` component.
 */
export interface QuiltFrameworkContextProps {
  /** The navigation instance. */
  navigation?: Navigation;
  /** The current route navigation entry (set automatically by `useRoutes()`). */
  navigationEntry?: RouteNavigationEntry<any, any>;
  /** The localization instance. */
  localization?: Localization;
  /** Browser environment details. */
  browser?: BrowserDetails;
  /** The application's asset manifest. */
  assets?: BrowserAssets;
  /** Performance monitoring context. */
  performance?: Performance;
  /**
   * Async context for this application. Enables async action caching,
   * default async component render options, and hydration tracking.
   */
  async?: {
    /** Shared cache for async actions. Required for SSR. */
    cache?: AsyncActionCache;
    /** Default render options for async components. */
    components?: Pick<AsyncComponentProps<any>, 'render'>;
    /**
     * Whether to serialize the cache for client-side hydration.
     * Defaults to `true` when a cache is provided.
     */
    serialize?: boolean;
  };
  /**
   * The GraphQL client for this application, or a plain object with
   * `fetch` (and optional `cache`) properties.
   */
  graphql?: Pick<GraphQLClient, 'fetch' | 'cache'>;
  children?: ComponentChildren;
}

/**
 * Provides a `QuiltContext` value to the component tree. Accepts any declared
 * `QuiltContext` fields as props and memoizes the context object so that
 * consumers only re-render when a field they use actually changes.
 *
 * Also manages async hydration tracking and optional async action cache
 * serialization — no separate `<AsyncContext>` needed.
 *
 * Use this component at the root of your application to provide navigation,
 * localization, browser details, and other app-wide context.
 *
 * @example
 * <QuiltFrameworkContext navigation={context.navigation} localization={context.localization}>
 *   <App />
 * </QuiltFrameworkContext>
 */
export function QuiltFrameworkContext({
  navigation,
  navigationEntry,
  localization,
  browser,
  assets,
  performance,
  async: asyncProp,
  graphql,
  children,
}: QuiltFrameworkContextProps) {
  const parentContext = useContext(QuiltFrameworkContextPreact);

  const asyncValue = useAsyncContext(asyncProp);

  const memoizedValue = useMemo(
    () =>
      ({
        ...parentContext,
        ...(navigation == null ? undefined : {navigation}),
        ...(navigationEntry == null ? undefined : {navigationEntry}),
        ...(localization == null ? undefined : {localization}),
        ...(browser == null ? undefined : {browser}),
        ...(assets == null ? undefined : {assets}),
        ...(performance == null ? undefined : {performance}),
        async: asyncValue,
        ...(graphql == null ? undefined : {graphql}),
      }) satisfies QuiltContext,
    [
      parentContext,
      navigation,
      navigationEntry,
      localization,
      browser,
      assets,
      performance,
      asyncValue,
      graphql,
    ],
  );

  if (typeof document !== 'object') {
    if (navigation?.cache) {
      // Serialize the navigation cache for server-side rendering.
      useAsyncActionCacheSerialization(navigation.cache, {
        name: 'quilt:router',
      });
    }
  }

  return (
    <>
      {localization && (
        <HTMLAttributes
          lang={localization.locale}
          dir={localization.direction}
        />
      )}
      <QuiltFrameworkContextPreact.Provider value={memoizedValue}>
        {children}
      </QuiltFrameworkContextPreact.Provider>
    </>
  );
}

function useAsyncContext({
  cache: asyncCache,
  components: asyncComponents,
  serialize: asyncSerialize = true,
}: NonNullable<QuiltFrameworkContextProps['async']> = {}): AsyncContext {
  // Hydration signal: starts false on the server, flips to true after
  // the first client-side render. Stable across re-renders via useRef.
  const hydratedSignal = useMemo(() => signal(false), []);

  if (typeof document === 'object') {
    useLayoutEffect(() => {
      hydratedSignal.value = true;
    }, []);
  }

  if (typeof document !== 'object') {
    // Serialize the async action cache for server-side rendering.
    useAsyncActionCacheSerialization(asyncSerialize ? asyncCache : undefined, {
      name: 'quilt:async',
      optional: true,
    });
  }

  return useMemo(
    () =>
      ({
        cache: asyncCache,
        components: asyncComponents,
        get isHydrated() {
          return hydratedSignal.value;
        },
      }) satisfies AsyncContext,
    [asyncCache, asyncComponents, hydratedSignal],
  );
}
