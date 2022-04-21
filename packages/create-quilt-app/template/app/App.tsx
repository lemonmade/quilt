import {AppContext, Router} from '@quilted/quilt';

import {Head} from './foundation/Head';
import {Http} from './foundation/Http';
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
