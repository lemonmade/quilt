import type {RenderableProps} from 'preact';
import {Suspense} from 'preact/compat';

import styles from './Frame.module.css';

export function Frame({children}: RenderableProps<{}>) {
  return (
    <div className={styles.Frame}>
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}
