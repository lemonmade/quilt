import {useRoutes} from '@quilted/quilt/navigate';
import {usePerformanceNavigation} from '@quilted/quilt/performance';

export function Routes() {
  return useRoutes([{match: '/', render: () => <Start />}]);
}

function Start() {
  usePerformanceNavigation({state: 'complete'});
  return <div>Start</div>;
}
