import type {ComponentChildren} from 'preact';
import type {
  Match,
  NavigateTo,
  EnhancedURL as BaseEnhancedURL,
} from '@quilted/routing';

export type EnhancedURL = BaseEnhancedURL & {
  readonly key: string;
  readonly state: {[key: string]: unknown};
};

export interface Focusable {
  focus(): void;
}

export type Blocker = (to: EnhancedURL, redo: () => void) => boolean;

export interface RouteRenderDetails {
  url: EnhancedURL;
  matched: string;
  consumed?: string;
  previouslyConsumed?: string;
  children?: ComponentChildren;
}

export interface RouteRenderPreloadDetails {
  url: URL;
  matched: string;
}

export interface RouteDefinition {
  match?: Match | Match[];
  exact?: boolean;
  children?: RouteDefinition[];
  redirect?: NavigateTo;
  render?:
    | ComponentChildren
    | ((details: RouteRenderDetails) => ComponentChildren);
  renderPreload?:
    | ComponentChildren
    | ((details: RouteRenderPreloadDetails) => ComponentChildren);
  renderStatic?: boolean | (() => string[] | Promise<string[]>);
}

export type Routes = readonly RouteDefinition[];
