import {App as QuiltApp} from '@quilted/quilt';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
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
