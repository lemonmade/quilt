import type {ReactNode} from 'react';
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
  children?: ReactNode;
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
  render?(details: RouteRenderDetails): ReactNode;
  renderPreload?(details: RouteRenderPreloadDetails): ReactNode;
  renderStatic?: boolean | (() => string[] | Promise<string[]>);
}

export type Routes = readonly RouteDefinition[];
