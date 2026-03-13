import {useMemo} from 'preact/hooks';
import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';
import {QuiltFrameworkContext} from '@quilted/quilt/context';
import {useBrowserDetails} from '@quilted/quilt/browser';

import {performance} from '../../common/globals.ts';

import {HTML} from './foundation/HTML.tsx';
import {Routes} from './foundation/Routes.tsx';

export function App() {
  const browser = useBrowserDetails({optional: true});

  const navigation = useMemo(() => new Navigation(browser?.request.url), []);
  const localization = useMemo(
    () =>
      new Localization(
        browser?.locale.value ??
          (typeof navigator !== 'undefined' ? navigator.language : 'en'),
      ),
    [browser?.locale.value],
  );

  return (
    <QuiltFrameworkContext
      navigation={navigation}
      localization={localization}
      performance={performance}
    >
      <HTML>
        <Routes />
      </HTML>
    </QuiltFrameworkContext>
  );
}

export default App;
