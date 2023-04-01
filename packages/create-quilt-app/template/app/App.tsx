import {QuiltApp} from '@quilted/quilt';

import {Head} from './foundation/Head.tsx';
import {Http} from './foundation/Http.tsx';
import {Routes} from './foundation/Routes.tsx';

export default function App() {
  return (
    <QuiltApp http={<Http />} html={<Head />}>
      <Routes />
    </QuiltApp>
  );
}
