import {HTML} from '@quilted/quilt/html';
import {Routing} from '@quilted/quilt/navigate';
import {Localization} from '@quilted/quilt/localize';
import {PerformanceContext} from '@quilted/quilt/performance';

import {performance} from '../../common/globals.ts';

import {Head} from './foundation/Head.tsx';
import {Headers} from './foundation/Headers.tsx';
import {Routes} from './foundation/Routes.tsx';

export function App() {
  return (
    <HTML>
      <PerformanceContext performance={performance}>
        <Localization locale="en">
          <Routing>
            <Headers />
            <Head />
            <Routes />
          </Routing>
        </Localization>
      </PerformanceContext>
    </HTML>
  );
}

export default App;
