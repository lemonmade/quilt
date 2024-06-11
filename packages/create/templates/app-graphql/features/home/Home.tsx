import {useGraphQLQuery} from '@quilted/quilt/graphql';

import styles from './Home.module.css';
import homeQuery from './HomeQuery.graphql';

export default function Home() {
  const query = useGraphQLQuery(homeQuery);

  const me = query.result?.data?.me;
  const greeting = me ? `Hello ${me.name}!` : 'Hello!';

  return <div className={styles.Home}>{greeting}</div>;
}
