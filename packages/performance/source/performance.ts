import {createEmitter, type Emitter} from '@quilted/events';

export interface PerformanceNavigationTimingOptions<
  Metadata = Record<string, unknown>,
> {
  at?: number;
  metadata?: Metadata;
}

export interface PerformanceInflightNavigation<
  Metadata = Record<string, unknown>,
> {
  readonly index: number;
  readonly target: URL;
  readonly start: number;
  readonly metadata: Metadata;
  end(
    options?: PerformanceNavigationTimingOptions<Metadata>,
  ): PerformanceNavigation<Metadata>;
  cancel(
    options?: PerformanceNavigationTimingOptions<Metadata>,
  ): PerformanceNavigation<Metadata>;
}

export interface PerformanceNavigation<Metadata = Record<string, unknown>> {
  readonly index: number;
  readonly target: URL;
  readonly status: 'cancelled' | 'completed';
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly metadata: Metadata;
}

interface PerformanceEventMap<Metadata = Record<string, unknown>> {
  navigation: PerformanceNavigation<Metadata>;
}

export interface Performance<Metadata = Record<string, unknown>> {
  readonly currentNavigation?: PerformanceInflightNavigation<Metadata>;
  readonly navigationCount: number;
  readonly navigations: PerformanceNavigation<Metadata>[];
  start(
    options: {target: URL} & PerformanceNavigationTimingOptions<Metadata>,
  ): PerformanceInflightNavigation<Metadata>;
  on: Emitter<PerformanceEventMap<Metadata>>['on'];
}

export function createPerformance<Metadata = Record<string, unknown>>() {
  let currentNavigation: PerformanceInflightNavigation<Metadata> | undefined;
  let navigationCount = 0;

  const navigations: PerformanceNavigation<Metadata>[] = [];
  const emitter = createEmitter<PerformanceEventMap>();

  const performance: Performance<Metadata> = {
    get currentNavigation() {
      return currentNavigation;
    },
    get navigationCount() {
      return navigationCount;
    },
    get navigations() {
      return navigations;
    },
    start({target, metadata = {} as Metadata}) {
      const oldNavigation = currentNavigation;

      const inflightNavigation: PerformanceInflightNavigation<Metadata> = {
        index: navigationCount,
        target,
        start: now(),
        metadata,
        end(options) {
          return finishNavigation('cancelled', options);
        },
        cancel(options) {
          return finishNavigation('cancelled', options);
        },
      };

      navigationCount += 1;
      currentNavigation = inflightNavigation;

      oldNavigation?.cancel();

      return inflightNavigation;

      function finishNavigation(
        status: PerformanceNavigation['status'],
        options?: PerformanceNavigationTimingOptions<Metadata>,
      ) {
        const end = options?.at ?? now();
        const navigation: PerformanceNavigation<Metadata> = {
          index: inflightNavigation.index,
          target,
          status,
          start: inflightNavigation.start,
          end,
          duration: end - inflightNavigation.start,
          metadata: options?.metadata
            ? {...inflightNavigation.metadata, ...options.metadata}
            : inflightNavigation.metadata,
        };

        if (currentNavigation === inflightNavigation) {
          currentNavigation = undefined;
        }

        navigations.push(navigation);

        emitter.emit('navigation', navigation as any);

        return navigation;
      }
    },
    on: emitter.on,
  };

  return performance;
}

function now() {
  return typeof performance === 'undefined'
    ? Date.now()
    : performance.now() + performance.timeOrigin;
}
