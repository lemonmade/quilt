import {useRoutes} from '@quilted/quilt';

import {Start} from '../features/Start.tsx';

export function Routes() {
  return useRoutes([{match: '/', render: () => <Start />}]);
}
