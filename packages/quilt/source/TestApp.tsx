import {type PropsWithChildren} from 'react';

import {type Router} from '@quilted/react-router';

import {QuiltApp} from './App';

interface Props {
  /**
   * Customizes how routing is handled during testing. You can provide a test router, or
   * you can pass `false` to disable Quilt’s routing features.
   */
  routing?: boolean | Router;

  /**
   * Customizes how localization is handled during testing. You can provide a string locale,
   * or you can pass `false` to disable Quilt’s localization features.
   */
  localization?: boolean | string;
}

// TODO: have craft options to remove the bundle impact of parts of this that are
// unused.
export function QuiltAppTesting({
  routing = true,
  localization = true,
  children,
}: PropsWithChildren<Props>) {
  return (
    <QuiltApp routing={routing} localization={localization}>
      {children}
    </QuiltApp>
  );
}
