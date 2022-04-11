import type {ServerActionKind} from '@quilted/react-server-render';
import type {RouteDefinition} from './types';

export {StaticRendererContext} from './context';

export interface RouteRecord {
  routes: RouteDefinition[];
  prefix?: string;
  fallback?: boolean;
  consumedPath?: string;
}

export const SERVER_ACTION_ID = Symbol('router');

export class StaticRenderer {
  readonly kind: ServerActionKind = {
    id: SERVER_ACTION_ID,
    betweenEachPass: () => this.reset(),
  };
  private readonly records = new Set<RouteRecord>();
  private readonly forceFallbackPath: string | undefined;

  get state() {
    return [...this.records];
  }

  constructor({forceFallback}: {forceFallback?: string} = {}) {
    this.forceFallbackPath = forceFallback;
  }

  record(record: RouteRecord) {
    this.records.add(record);
  }

  forceFallback(route: string) {
    return route === this.forceFallbackPath;
  }

  private reset() {
    this.records.clear();
  }
}
