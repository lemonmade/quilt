export type {NavigateTo, EnhancedURL} from '@quilted/routing';

export {
  Link,
  Routing,
  Redirect,
  RoutePreloading,
  NavigationBlock,
} from './components.ts';

export {useRoutes} from './hooks/routes.tsx';
export {useCurrentUrl} from './hooks/url.ts';
export {useInitialURL} from './hooks/initial-url.ts';
export {useRouter} from './hooks/router.ts';
export {useNavigationBlock} from './hooks/navigation-block.ts';
export {useRouteChangeFocusRef} from './hooks/focus.ts';
export {useScrollRestoration} from './hooks/scroll.ts';
export {useRedirect} from './hooks/redirect.ts';
export {
  useRouteMatch,
  useRouteMatchDetails,
  type RouteMatchOptions,
} from './hooks/match.ts';
export {useNavigate} from './hooks/navigate.ts';

export {containedByPrefix} from './utilities.ts';
export {InitialURLContext} from './context.ts';
export type {Router} from './router.ts';
export type {Routes, RouteDefinition, RouteRenderDetails} from './types.ts';
