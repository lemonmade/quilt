import type {RouteDefinition} from './types.ts';
export {StaticRendererContext} from './context.ts';

export interface RouteRecord {
  routes: readonly RouteDefinition[];
  prefix?: string;
  fallback?: boolean;
  consumedPath?: string;
}

export class StaticRenderer {
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
}
