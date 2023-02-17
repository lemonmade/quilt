import {
  usePerformanceNavigationEvent,
  type PropsWithChildren,
} from '@quilted/quilt';
import Env from '@quilted/quilt/env';

// This component records metrics about your application.
export function Metrics({children}: PropsWithChildren) {
  usePerformanceNavigationEvent(async (navigation) => {
    if (Env.MODE === 'development') {
      // eslint-disable-next-line no-console
      console.log('Navigation:');
      // eslint-disable-next-line no-console
      console.log(navigation);
      return;
    }

    // If you have a service that collects metrics, you can send navigation
    // data to them here.
  });

  return <>{children}</>;
}
