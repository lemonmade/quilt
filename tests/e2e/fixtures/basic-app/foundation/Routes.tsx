import {useRoutes} from '@quilted/quilt/navigate';
import {usePerformanceNavigation} from '@quilted/quilt/performance';

export function Routes() {
  return useRoutes([{match: '/', render: () => <Home />}]);
}

function Home() {
  usePerformanceNavigation({state: 'complete'});
  return <div>Home</div>;
}
