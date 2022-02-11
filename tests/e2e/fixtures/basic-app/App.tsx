import {App as QuiltApp} from '@quilted/quilt';

import {performance} from '../../common/globals';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
import {Routes} from './foundation/Routes';

export default function App() {
  return (
    <QuiltApp performance={performance}>
      <Http />
      <Head />
      <Routes />
    </QuiltApp>
  );
}
