import type {PropsWithChildren} from 'react';

import styles from './Frame.module.css';

export function Frame({children}: PropsWithChildren) {
  return <div className={styles.Frame}>{children}</div>;
}
