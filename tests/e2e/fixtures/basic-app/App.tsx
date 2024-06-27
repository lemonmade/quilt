import {Navigation} from '@quilted/quilt/navigate';
import {Localization} from '@quilted/quilt/localize';
import {PerformanceContext} from '@quilted/quilt/performance';

import {performance} from '../../common/globals.ts';

import {HTML} from './foundation/HTML.tsx';
import {Routes} from './foundation/Routes.tsx';

export function App() {
  return (
    <PerformanceContext performance={performance}>
      <Localization locale="en">
        <HTML>
          <Navigation>
            <Routes />
          </Navigation>
        </HTML>
      </Localization>
    </PerformanceContext>
  );
}

export default App;
