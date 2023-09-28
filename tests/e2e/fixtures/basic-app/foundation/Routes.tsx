import {useRoutes} from '@quilted/quilt/navigate';

export function Routes() {
  return useRoutes([{match: '/', render: () => <Start />}]);
}

function Start() {
  return <div>Start</div>;
}
