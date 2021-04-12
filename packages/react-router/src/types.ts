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
  children?: ReactNode;
}

export interface RouteRenderPrefetchDetails {
  url: URL;
  matched: string;
}

export interface RouteDefinition {
  match?: Match;
  children?: RouteDefinition[];
  redirect?: NavigateTo;
  render?(details: RouteRenderDetails): ReactNode;
  renderPrefetch?(details: RouteRenderPrefetchDetails): ReactNode;
}
