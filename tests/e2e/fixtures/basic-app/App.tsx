import {QuiltApp} from '@quilted/quilt';

import {performance} from '../../common/globals.ts';

import {Http} from './foundation/Http.tsx';
import {Head} from './foundation/Head.tsx';
import {Routes} from './foundation/Routes.tsx';

export default function App() {
  return (
    <QuiltApp http={<Http />} html={<Head />} performance={performance}>
      <Routes />
    </QuiltApp>
  );
}
