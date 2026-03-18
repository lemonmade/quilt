export type {
  NavigateTo,
  NavigateToLiteral,
  NavigateToSearch,
  RouteMatch,
  RouteMatcher,
  RouteMatchDetails,
} from '@quilted/routing';

export * from './types.ts';
export {
  Navigation,
  RouterNavigationCache,
  type NavigationOptions,
  type NavigateOptions,
} from './Navigation.ts';
export {route, fallbackRoute, createContextRouteFunction} from './route.ts';

export {Link} from './components/Link.tsx';
export {Redirect} from './components/Redirect.tsx';
export {Routes} from './components/Routes.tsx';

export {useCurrentURL} from './hooks/current-url.ts';
export {useNavigate} from './hooks/navigate.ts';
export {useRouteData} from './hooks/route-data.ts';
export {useRouteNavigationEntry} from './hooks/route-navigation-entry.ts';
export {useNavigation} from './hooks/navigation.ts';
export {useRoutes} from './hooks/routes.tsx';
