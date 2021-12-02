import {FocusEvent, useEffect, useRef, forwardRef} from 'react';
import type {
  MouseEvent,
  PointerEvent,
  DetailedHTMLProps,
  AnchorHTMLAttributes,
} from 'react';
import type {NavigateTo, RelativeTo} from '@quilted/routing';

import type {Preloader, State} from '../../types';
import {useRoutePreloader, useRouter} from '../../hooks';

interface Props
  extends Omit<
    DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >,
    'href'
  > {
  /**
   * The target for this link. The provided value will be resolved by the router
   * and used as an `href` property on the `<a>` tag rendered by this component.
   */
  to: NavigateTo;

  /**
   * Whether this link should use a “standard” browser navigation when this link
   * is pressed, instead of using the browser’s history API to change the URL
   * without a full page reload.
   *
   * By default, this component will perform a full-page navigation when the
   * resolved URL is to a separate domain, or to a path outside the containing
   * `<Router>` component’s `prefix`. You can force a full-age navigation in
   * any situation by setting this prop to `true`.
   */
  external?: boolean;

  /**
   * Whether the navigation that results from clicking this link should replace
   * the current URL in the history stack. Defaults to `false`, which means that
   * the new route is added as the newest entry in the history stack.
   */
  replace?: boolean;

  /**
   * Navigation state that will be associated with the new history entry created
   * when clicking this link. The `state` that was passed for the navigation is
   * available as the `state` property on the `useCurrentUrl()` object.
   */
  state?: State;

  /**
   * Whether this navigation should be relative to the router prefix, or to the
   * root of the domain. If you do not use a router prefix, you do not need to
   * pass this option.
   */
  relativeTo?: RelativeTo;

  /**
   * Controls whether this link should preload the route that it targets. By default,
   * routes will perform a conservative preload if you have nested your app in a
   * `<RoutePreloading>` component. This preloading will happen only when the user
   * starts pressing on the link. If the user does not have a data saver mode enabled,
   * the default preloading will also happen after a short delay when the user hovers
   * over the link.
   *
   * You can remove this default behavior by passing a boolean as the `preload` prop.
   * Passing `true` will force the link’s target to preload immediately, even if it is
   * not being interacted with by the user. Passing `false` will disable preloading
   * entirely — even when the user is pressing on this link, the target route’s `renderPreload()`
   * will not be called.
   */
  preload?: boolean;
}

interface PreloadingInternals {
  teardown?(): void;
}

/**
 * Renders an [`<a>` (anchor) element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a)
 * with its `href` property set to the target you pass as the `to` prop. Unlike
 * `href`, `to` can accept more than just a string. You can pass this component
 * a string describing a relative or absolute path in your application, an object
 * with `path`, `search`, and `hash` fields, a `URL` object, or a function that
 * is called with the current URL, and returns any of the above.
 *
 * You should render a `<Link>` component for as much of the navigation in your
 * application as possible. Because this component renders a real `<a>` element,
 * it works even if JavaScript has failed to load or is still being loaded. If you
 * need to perform navigation in response to events other than a click in the UI,
 * you can instead use the `useNavigate()` hook.
 */
export const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  {
    children,
    to,
    onClick,
    external: explicitlyExternal = false,
    replace,
    state,
    target,
    preload,
    relativeTo,
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerLeave,
    onPointerCancel,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const router = useRouter();
  const preloader = useRoutePreloader();
  const {url, external} = router.resolve(to);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      explicitlyExternal ||
      external ||
      // Only consider left clicks
      event.button !== 0 ||
      // If `onClick` prevented default, prevent navigation
      event.defaultPrevented ||
      // Ignore links that open in a different browsing context
      (target != null && target !== '_self') ||
      // Ignore modifier clicks
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    ) {
      return;
    }

    event.preventDefault();
    router.navigate(url, {replace, state, relativeTo});
  };

  if (preload) {
    if (preloader == null) {
      throw new Error(
        `Attempted to force a link to preload but it is not wrapped in a <RoutePreloading> component.`,
      );
    }

    if (external) {
      throw new Error(`Can’t preload external route: ${url.href}`);
    }
  }

  // The preloading logic here is pretty basic, and doesn’t handle some edge
  // cases, like:
  //
  // - Changing the `to` prop in a way that changes the resolved URL part-way
  //   through a preload operation.
  // - Interleaving events that cause preloads to start/ stop in an unusual order
  //   (e.g., doing pointerenter, focus, blur, pointerleave incorrectly cancels
  //   the preload after the blur).
  const preloadingInternalsRef = useRef<PreloadingInternals>({});
  const needsBasicPreloadListeners =
    preloader != null && preload == null && !external;
  const needsAggressivePreloadListeners =
    needsBasicPreloadListeners && preloader!.level === 'high';

  const handlePointerDown = needsBasicPreloadListeners
    ? (event: PointerEvent<HTMLAnchorElement>) => {
        onPointerDown?.(event);

        if (event.defaultPrevented) return;

        const newTeardown = preloader!.add(url);
        runPreloadTeardown(preloadingInternalsRef.current);
        preloadingInternalsRef.current.teardown = newTeardown;
      }
    : onPointerDown;

  const handlePointerUp = needsBasicPreloadListeners
    ? (event: PointerEvent<HTMLAnchorElement>) => {
        onPointerUp?.(event);
        runPreloadTeardown(preloadingInternalsRef.current);
      }
    : onPointerUp;

  const handlePointerCancel = needsBasicPreloadListeners
    ? (event: PointerEvent<HTMLAnchorElement>) => {
        onPointerCancel?.(event);
        runPreloadTeardown(preloadingInternalsRef.current);
      }
    : onPointerCancel;

  const handlePointerEnter = needsAggressivePreloadListeners
    ? (event: PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(event);
        if (event.defaultPrevented) return;
        preloadOnTimeout(url, preloader!, preloadingInternalsRef.current);
      }
    : onPointerEnter;

  const handlePointerLeave = needsAggressivePreloadListeners
    ? (event: PointerEvent<HTMLAnchorElement>) => {
        onPointerLeave?.(event);
        runPreloadTeardown(preloadingInternalsRef.current);
      }
    : onPointerLeave;

  const handleFocus = needsAggressivePreloadListeners
    ? (event: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event);
        if (event.defaultPrevented) return;
        preloadOnTimeout(url, preloader!, preloadingInternalsRef.current);
      }
    : onFocus;

  const handleBlur = needsAggressivePreloadListeners
    ? (event: FocusEvent<HTMLAnchorElement>) => {
        onBlur?.(event);
        runPreloadTeardown(preloadingInternalsRef.current);
      }
    : onBlur;

  return (
    <>
      <a
        ref={ref}
        href={url.href}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
        onFocus={handleFocus}
        onBlur={handleBlur}
        target={target}
        {...rest}
      >
        {children}
      </a>
      {preload ? <ManualPreload url={url} preloader={preloader!} /> : null}
    </>
  );
});

function ManualPreload({url, preloader}: {url: URL; preloader: Preloader}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => preloader.add(url), [url.href, preloader]);
  return null;
}

function runPreloadTeardown(internals: PreloadingInternals) {
  if (internals.teardown == null) return;
  internals.teardown();
  internals.teardown = undefined;
}

function preloadOnTimeout(
  url: URL,
  preloader: Preloader,
  internals: PreloadingInternals,
) {
  if (internals.teardown != null) return;

  let stopPreloading: ReturnType<Preloader['add']>;

  const timeout = setTimeout(() => {
    stopPreloading = preloader.add(url);
  });

  internals.teardown = () => {
    clearTimeout(timeout);
    stopPreloading?.();
  };
}
