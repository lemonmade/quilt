import {Component, type RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';
import {useAsyncActionCacheSerialization} from '@quilted/preact-async';

import {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';
import type {RouteDefinition} from '../types.ts';

import {Routes} from './Routes.tsx';

export interface NavigationProps<Context = unknown> {
  router?: Router;
  routes?: readonly RouteDefinition<any, any, Context>[];
  context?: Context;
  serialize?: boolean;
}

export function Navigation<Context = unknown>({
  router: explicitRouter,
  routes,
  context,
  children,
  serialize = true,
}: RenderableProps<NavigationProps<Context>>) {
  const browser = useBrowserDetails({optional: true});
  const router = useMemo(
    () => explicitRouter ?? new Router(browser?.request.url),
    [explicitRouter],
  );

  if (router.cache && serialize) {
    useAsyncActionCacheSerialization(router.cache, {name: 'router'});
  }

  const content = routes ? (
    <Routes list={routes} context={context} />
  ) : (
    children
  );

  return (
    <NavigationErrorBoundary router={router}>
      <RouterContext.Provider value={router}>{content}</RouterContext.Provider>
    </NavigationErrorBoundary>
  );
}

interface NavigationErrorBoundaryProps {
  router: Router;
}

class NavigationErrorBoundary extends Component<NavigationErrorBoundaryProps> {
  state = {error: false};

  static getDerivedStateFromError() {
    return {error: true};
  }

  componentDidCatch(error: unknown) {
    if (
      error instanceof Response &&
      error.status >= 300 &&
      error.status < 400
    ) {
      this.props.router.navigate(error.headers.get('Location') ?? '/', {
        replace: true,
      });

      this.setState({error: true});
    }
  }

  render() {
    return this.state.error ? null : this.props.children;
  }
}
