export interface PerformanceInflightNavigation {
  readonly target: URL;
  end(): PerformanceNavigation;
  cancel(): PerformanceNavigation;
}

export interface PerformanceNavigation {
  readonly target: URL;
}

interface PerformanceEventMap {
  navigation: (navigation: PerformanceNavigation) => void;
}

export interface Performance {
  readonly currentNavigation?: PerformanceInflightNavigation;
  readonly navigationCount: number;
  readonly navigations: PerformanceNavigation[];
  start(details: {target: URL}): PerformanceInflightNavigation;
  on<Event extends keyof PerformanceEventMap>(
    event: Event,
    listener: PerformanceEventMap[Event],
  ): () => void;
}

export function createPerformance() {
  let currentNavigation: PerformanceInflightNavigation | undefined;
  let navigationCount = 0;
  const navigations: PerformanceNavigation[] = [];
  const eventListeners: {
    [K in keyof PerformanceEventMap]: Set<PerformanceEventMap[K]>;
  } = {
    navigation: new Set(),
  };

  const performance: Performance = {
    get currentNavigation() {
      return currentNavigation;
    },
    get navigationCount() {
      return navigationCount;
    },
    get navigations() {
      return navigations;
    },
    start({target}) {
      const oldNavigation = currentNavigation;

      const navigation: PerformanceNavigation = {target};
      const inflightNavigation: PerformanceInflightNavigation = {
        target,
        end() {
          return finishNavigation();
        },
        cancel() {
          return finishNavigation();
        },
      };

      function finishNavigation() {
        navigationCount += 1;

        if (currentNavigation === inflightNavigation) {
          currentNavigation = undefined;
        }

        navigations.push(navigation);

        triggerListeners('navigation', navigation);

        return navigation;
      }

      currentNavigation = inflightNavigation;
      oldNavigation?.cancel();

      return inflightNavigation;
    },
    on(event, listener) {
      const listeners = eventListeners[event];
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  return performance;

  function triggerListeners<Event extends keyof PerformanceEventMap>(
    event: Event,
    ...args: Parameters<PerformanceEventMap[Event]>
  ) {
    for (const listener of eventListeners[event]) {
      (listener as any)(...args);
    }
  }
}
