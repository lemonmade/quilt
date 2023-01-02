import {QuiltApp, useRoutes} from '@quilted/quilt';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';

import {Start} from './features/Start';

// The root component for your application. You will typically render any
// app-wide context in this component.
export default function App() {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <Routes />
    </QuiltApp>
  );
}

// This component renders the routes for your application. If you have a lot
// of routes, you may want to split this component into its own file.
function Routes() {
  return useRoutes([{match: '/', render: () => <Start />}]);
}
