import type {PropsWithChildren} from '@quilted/quilt/react/tools';

import styles from './Frame.module.css';

export function Frame({children}: PropsWithChildren) {
  return <div className={styles.Frame}>{children}</div>;
}
