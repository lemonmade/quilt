import type {RenderableProps} from 'preact';

import styles from './Frame.module.css';

export function Frame({children}: RenderableProps<{}>) {
  return <div className={styles.Frame}>{children}</div>;
}
