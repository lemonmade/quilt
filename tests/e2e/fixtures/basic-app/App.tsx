import {AppContext, Router} from '@quilted/quilt';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
import {Routes} from './foundation/Routes';

export default function App() {
  return (
    <AppContext>
      <Router>
        <Http />
        <Head />
        <Routes />
      </Router>
    </AppContext>
  );
}
