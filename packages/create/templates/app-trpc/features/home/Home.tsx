import {trpc} from '~/context/trpc.ts';

import styles from './Home.module.css';

export default function Home() {
  const [data] = trpc.message.useSuspenseQuery('world');

  return <div className={styles.Home}>{data}</div>;
}
