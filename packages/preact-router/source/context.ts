import type {RouteNavigationEntry} from './types.ts';
import type {Navigation} from './Navigation.ts';

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * The navigation context for your application. The `Navigation` class manages
     * the current URL, browser history, and programmatic navigation. Provide this
     * field to make routing hooks like `useCurrentURL()` and `useNavigate()` work.
     *
     */
    readonly navigation?: Navigation;

    /**
     * The current route navigation entry, automatically set by `useRoutes()` for
     * the route matched at each level of nesting. Contains the matched URL segments,
     * route definition, loaded data, and any route input values.
     *
     */
    readonly navigationEntry?: RouteNavigationEntry<any, any>;
  }
}
