import {HTML} from '@quilted/quilt/html';
import {Routing} from '@quilted/quilt/navigate';
import {Localization, useLocaleFromEnvironment} from '@quilted/quilt/localize';

import {Head} from './foundation/Head.tsx';
import {Http} from './foundation/Http.tsx';
import {Routes} from './foundation/Routes.tsx';

export default function App() {
  const locale = useLocaleFromEnvironment() ?? 'en';

  return (
    <HTML>
      <Localization locale={locale}>
        <Routing>
          <Http />
          <Head />
          <Routes />
        </Routing>
      </Localization>
    </HTML>
  );
}
