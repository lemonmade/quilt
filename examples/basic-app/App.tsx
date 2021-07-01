import {App as QuiltApp} from '@quilted/quilt';

import {Head} from './foundation/Head';
import {Http} from './foundation/Http';
import {Routes} from './foundation/Routes';

export default function App() {
  return (
    <QuiltApp>
      <Http />
      <Head />
      <Routes />
    </QuiltApp>
  );
}
