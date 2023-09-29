import {trpc} from '~/shared/trpc.ts';

import styles from './Start.module.css';

export default function Start() {
  const [data] = trpc.message.useSuspenseQuery('world');

  return <div className={styles.Start}>{data}</div>;
}
