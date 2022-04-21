import {AppContext, PerformanceContext, Router} from '@quilted/quilt';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
import {Routes} from './foundation/Routes';

export default function App() {
  return (
    <AppContext>
      <Router>
        <PerformanceContext>
          <Http />
          <Head />
          <Routes />
        </PerformanceContext>
      </Router>
    </AppContext>
  );
}
