import {QuiltApp} from '@quilted/quilt';

import {Http} from './foundation/Http';
import {Head} from './foundation/Head';
import {Routes} from './foundation/Routes';

export default function App() {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <Routes />
    </QuiltApp>
  );
}
