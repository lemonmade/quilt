import {createPerformance, type Performance} from '@quilted/quilt';

export interface Waiter {
  wait(id: string): Promise<void>;
  done(id: string): void;
}

declare global {
  interface Window {
    Quilt?: {
      E2E?: {
        Waiter?: Waiter;
        Performance?: Performance;
      };
    };
  }
}

export const performance = createPerformance();

const waitingFor = new Map<string, Set<() => void>>();

export const waiter: Waiter = {
  wait(id) {
    let waiters = waitingFor.get(id);

    if (waiters == null) {
      waiters = new Set();
      waitingFor.set(id, waiters);
    }

    return new Promise((resolve) => {
      waiters!.add(resolve);
    });
  },
  done(id) {
    const waiters = Array.from(waitingFor.get(id) ?? []);

    for (const waiter of waiters) {
      waiter();
    }

    waitingFor.delete(id);
  },
};

// We expose this on a global so that our end-to-end tests can easily
// run them.
if (typeof window !== 'undefined') {
  window.Quilt ??= {};
  window.Quilt.E2E ??= {};
  window.Quilt.E2E.Performance ??= performance;
  window.Quilt.E2E.Waiter ??= waiter;
}
