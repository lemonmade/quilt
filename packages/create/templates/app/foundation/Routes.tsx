import {useRoutes} from '@quilted/quilt';

import {Start} from '../features/Start';

export function Routes() {
  return useRoutes([{match: '/', render: () => <Start />}]);
}
